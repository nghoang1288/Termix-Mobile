const DEFAULT_MAX_BUFFER_CHARS = 120000;

type Cursor = {
  row: number;
  col: number;
};

type SavedPrimaryState = {
  screen: string[][];
  scrollback: string[];
  cursor: Cursor;
  savedCursor: Cursor;
  scrollTop: number;
  scrollBottom: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFinalByte(char: string) {
  const code = char.charCodeAt(0);
  return code >= 0x40 && code <= 0x7e;
}

function findStringTerminator(value: string, start: number) {
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "\x07") return index + 1;
    if (value[index] === "\x1b" && value[index + 1] === "\\") {
      return index + 2;
    }
  }

  return -1;
}

export class MobileTerminalEmulator {
  private cols: number;
  private rows: number;
  private readonly maxBufferChars: number;
  private screen: string[][];
  private scrollback: string[] = [];
  private cursor: Cursor = { row: 0, col: 0 };
  private savedCursor: Cursor = { row: 0, col: 0 };
  private scrollTop = 0;
  private scrollBottom: number;
  private pendingSequence = "";
  private alternateState: SavedPrimaryState | null = null;

  constructor(
    cols: number,
    rows: number,
    maxBufferChars = DEFAULT_MAX_BUFFER_CHARS,
  ) {
    this.cols = Math.max(1, cols);
    this.rows = Math.max(1, rows);
    this.maxBufferChars = maxBufferChars;
    this.scrollBottom = this.rows - 1;
    this.screen = this.createBlankScreen(this.rows);
  }

  reset(cols = this.cols, rows = this.rows) {
    this.cols = Math.max(1, cols);
    this.rows = Math.max(1, rows);
    this.screen = this.createBlankScreen(this.rows);
    this.scrollback = [];
    this.cursor = { row: 0, col: 0 };
    this.savedCursor = { row: 0, col: 0 };
    this.scrollTop = 0;
    this.scrollBottom = this.rows - 1;
    this.pendingSequence = "";
    this.alternateState = null;
  }

  resize(cols: number, rows: number) {
    const nextCols = Math.max(1, cols);
    const nextRows = Math.max(1, rows);
    if (nextCols === this.cols && nextRows === this.rows) return;

    const renderedLines = this.getRenderableLines();
    this.cols = nextCols;
    this.rows = nextRows;
    this.scrollTop = 0;
    this.scrollBottom = this.rows - 1;
    this.screen = this.createBlankScreen(this.rows);

    const visibleLines = renderedLines.slice(-this.rows);
    const scrollbackLines = renderedLines.slice(0, -this.rows);
    this.scrollback = this.alternateState ? [] : scrollbackLines;

    const screenStart = Math.max(0, this.rows - visibleLines.length);
    visibleLines.forEach((line, index) => {
      this.screen[screenStart + index] = this.stringToLine(line);
    });

    this.cursor = {
      row: clamp(screenStart + visibleLines.length - 1, 0, this.rows - 1),
      col: clamp(this.cursor.col, 0, this.cols - 1),
    };
    this.savedCursor = {
      row: clamp(this.savedCursor.row, 0, this.rows - 1),
      col: clamp(this.savedCursor.col, 0, this.cols - 1),
    };
    this.pruneScrollback();
  }

  write(rawData: string) {
    let data = this.pendingSequence + rawData;
    this.pendingSequence = "";

    let index = 0;
    while (index < data.length) {
      const char = data[index];

      if (char === "\x1b") {
        const nextIndex = this.consumeEscapeSequence(data, index);
        if (nextIndex === -1) {
          this.pendingSequence = data.slice(index);
          break;
        }
        index = nextIndex;
        continue;
      }

      this.writeControlOrText(char);
      index += 1;
    }
  }

  toString() {
    const lines = this.getRenderableLines();
    const text = lines.join("\n");
    if (text.length <= this.maxBufferChars) return text;

    const trimmed = text.slice(-this.maxBufferChars);
    const firstLineBreak = trimmed.indexOf("\n");
    return firstLineBreak > -1 ? trimmed.slice(firstLineBreak + 1) : trimmed;
  }

  private consumeEscapeSequence(data: string, start: number) {
    if (start + 1 >= data.length) return -1;

    const type = data[start + 1];

    if (type === "[") {
      let finalIndex = start + 2;
      while (finalIndex < data.length && !isFinalByte(data[finalIndex])) {
        finalIndex += 1;
      }

      if (finalIndex >= data.length) return -1;

      this.handleCsi(data.slice(start + 2, finalIndex), data[finalIndex]);
      return finalIndex + 1;
    }

    if (type === "]" || type === "P" || type === "_" || type === "^") {
      const endIndex = findStringTerminator(data, start + 2);
      return endIndex === -1 ? -1 : endIndex;
    }

    if (type === "(" || type === ")" || type === "*" || type === "+") {
      return start + 2 < data.length ? start + 3 : -1;
    }

    this.handleEsc(type);
    return start + 2;
  }

  private handleEsc(type: string) {
    switch (type) {
      case "c":
        this.reset(this.cols, this.rows);
        break;
      case "7":
        this.saveCursor();
        break;
      case "8":
        this.restoreCursor();
        break;
      case "D":
        this.lineFeed();
        break;
      case "E":
        this.carriageReturn();
        this.lineFeed();
        break;
      case "M":
        this.reverseIndex();
        break;
      default:
        break;
    }
  }

  private handleCsi(rawParams: string, final: string) {
    const params = this.parseParams(rawParams);
    const first = params.values[0];
    const count = Math.max(1, first ?? 1);

    switch (final) {
      case "A":
        this.cursor.row = clamp(
          this.cursor.row - count,
          this.scrollTop,
          this.scrollBottom,
        );
        break;
      case "B":
        this.cursor.row = clamp(
          this.cursor.row + count,
          this.scrollTop,
          this.scrollBottom,
        );
        break;
      case "C":
        this.cursor.col = clamp(this.cursor.col + count, 0, this.cols - 1);
        break;
      case "D":
        this.cursor.col = clamp(this.cursor.col - count, 0, this.cols - 1);
        break;
      case "E":
        this.cursor.row = clamp(
          this.cursor.row + count,
          this.scrollTop,
          this.scrollBottom,
        );
        this.cursor.col = 0;
        break;
      case "F":
        this.cursor.row = clamp(
          this.cursor.row - count,
          this.scrollTop,
          this.scrollBottom,
        );
        this.cursor.col = 0;
        break;
      case "G":
        this.cursor.col = clamp((first ?? 1) - 1, 0, this.cols - 1);
        break;
      case "H":
      case "f":
        this.cursor.row = clamp((params.values[0] ?? 1) - 1, 0, this.rows - 1);
        this.cursor.col = clamp((params.values[1] ?? 1) - 1, 0, this.cols - 1);
        break;
      case "J":
        this.clearScreen(first ?? 0);
        break;
      case "K":
        this.clearLine(first ?? 0);
        break;
      case "L":
        this.insertLines(count);
        break;
      case "M":
        this.deleteLines(count);
        break;
      case "P":
        this.deleteChars(count);
        break;
      case "@":
        this.insertChars(count);
        break;
      case "X":
        this.eraseChars(count);
        break;
      case "S":
        this.scrollUp(count);
        break;
      case "T":
        this.scrollDown(count);
        break;
      case "d":
        this.cursor.row = clamp((first ?? 1) - 1, 0, this.rows - 1);
        break;
      case "r":
        this.setScrollRegion(params.values[0], params.values[1]);
        break;
      case "s":
        this.saveCursor();
        break;
      case "u":
        this.restoreCursor();
        break;
      case "h":
        this.setMode(params.raw, true);
        break;
      case "l":
        this.setMode(params.raw, false);
        break;
      default:
        break;
    }
  }

  private parseParams(raw: string) {
    const values = raw
      .replace(/[?>=!]/g, "")
      .split(";")
      .map((part) => {
        if (part === "") return undefined;
        const value = Number.parseInt(part, 10);
        return Number.isFinite(value) ? value : undefined;
      });

    return { raw, values };
  }

  private setMode(raw: string, enabled: boolean) {
    if (!raw.startsWith("?")) return;

    const modes = raw
      .slice(1)
      .split(";")
      .map((value) => Number.parseInt(value, 10))
      .filter(Number.isFinite);

    if (modes.includes(47) || modes.includes(1047) || modes.includes(1049)) {
      if (enabled) {
        this.enterAlternateScreen();
      } else {
        this.leaveAlternateScreen();
      }
    }
  }

  private enterAlternateScreen() {
    if (this.alternateState) return;

    this.alternateState = {
      screen: this.screen.map((line) => [...line]),
      scrollback: [...this.scrollback],
      cursor: { ...this.cursor },
      savedCursor: { ...this.savedCursor },
      scrollTop: this.scrollTop,
      scrollBottom: this.scrollBottom,
    };
    this.screen = this.createBlankScreen(this.rows);
    this.scrollback = [];
    this.cursor = { row: 0, col: 0 };
    this.savedCursor = { row: 0, col: 0 };
    this.scrollTop = 0;
    this.scrollBottom = this.rows - 1;
  }

  private leaveAlternateScreen() {
    if (!this.alternateState) return;

    this.screen = this.alternateState.screen;
    this.scrollback = this.alternateState.scrollback;
    this.cursor = this.alternateState.cursor;
    this.savedCursor = this.alternateState.savedCursor;
    this.scrollTop = this.alternateState.scrollTop;
    this.scrollBottom = this.alternateState.scrollBottom;
    this.alternateState = null;
  }

  private writeControlOrText(char: string) {
    switch (char) {
      case "\n":
        this.lineFeed();
        break;
      case "\r":
        this.carriageReturn();
        break;
      case "\b":
      case "\x7f":
        this.backspace();
        break;
      case "\f":
        this.clearScreen(2);
        this.cursor = { row: 0, col: 0 };
        break;
      case "\t":
        this.tab();
        break;
      default:
        if (char >= " ") {
          this.writePrintable(char);
        }
        break;
    }
  }

  private writePrintable(char: string) {
    if (this.cursor.col >= this.cols) {
      this.cursor.col = 0;
      this.lineFeed();
    }

    this.screen[this.cursor.row][this.cursor.col] = char;
    this.cursor.col += 1;

    if (this.cursor.col >= this.cols) {
      this.cursor.col = 0;
      this.lineFeed();
    }
  }

  private tab() {
    const spaces = 8 - (this.cursor.col % 8);
    for (let index = 0; index < spaces; index += 1) {
      this.writePrintable(" ");
    }
  }

  private carriageReturn() {
    this.cursor.col = 0;
  }

  private backspace() {
    this.cursor.col = Math.max(0, this.cursor.col - 1);
  }

  private lineFeed() {
    if (this.cursor.row >= this.scrollBottom) {
      this.scrollUp(1, this.scrollTop, this.scrollBottom);
      this.cursor.row = this.scrollBottom;
      return;
    }

    this.cursor.row = clamp(this.cursor.row + 1, 0, this.rows - 1);
  }

  private reverseIndex() {
    if (this.cursor.row <= this.scrollTop) {
      this.scrollDown(1, this.scrollTop, this.scrollBottom);
      this.cursor.row = this.scrollTop;
      return;
    }

    this.cursor.row = clamp(this.cursor.row - 1, 0, this.rows - 1);
  }

  private saveCursor() {
    this.savedCursor = { ...this.cursor };
  }

  private restoreCursor() {
    this.cursor = {
      row: clamp(this.savedCursor.row, 0, this.rows - 1),
      col: clamp(this.savedCursor.col, 0, this.cols - 1),
    };
  }

  private clearLine(mode: number) {
    const line = this.screen[this.cursor.row];

    if (mode === 1) {
      this.fillLineRange(line, 0, this.cursor.col);
      return;
    }

    if (mode === 2) {
      this.fillLineRange(line, 0, this.cols - 1);
      return;
    }

    this.fillLineRange(line, this.cursor.col, this.cols - 1);
  }

  private clearScreen(mode: number) {
    if (mode === 3) {
      this.scrollback = [];
      return;
    }

    if (mode === 1) {
      for (let row = 0; row < this.cursor.row; row += 1) {
        this.screen[row] = this.blankLine();
      }
      this.fillLineRange(this.screen[this.cursor.row], 0, this.cursor.col);
      return;
    }

    if (mode === 2) {
      this.screen = this.createBlankScreen(this.rows);
      return;
    }

    this.fillLineRange(
      this.screen[this.cursor.row],
      this.cursor.col,
      this.cols - 1,
    );
    for (let row = this.cursor.row + 1; row < this.rows; row += 1) {
      this.screen[row] = this.blankLine();
    }
  }

  private insertChars(count: number) {
    const line = this.screen[this.cursor.row];
    line.splice(this.cursor.col, 0, ...Array(count).fill(" "));
    this.screen[this.cursor.row] = line.slice(0, this.cols);
  }

  private deleteChars(count: number) {
    const line = this.screen[this.cursor.row];
    line.splice(this.cursor.col, count);
    while (line.length < this.cols) line.push(" ");
    this.screen[this.cursor.row] = line.slice(0, this.cols);
  }

  private eraseChars(count: number) {
    this.fillLineRange(
      this.screen[this.cursor.row],
      this.cursor.col,
      Math.min(this.cols - 1, this.cursor.col + count - 1),
    );
  }

  private insertLines(count: number) {
    if (
      this.cursor.row < this.scrollTop ||
      this.cursor.row > this.scrollBottom
    ) {
      return;
    }

    const amount = Math.min(count, this.scrollBottom - this.cursor.row + 1);
    for (let index = 0; index < amount; index += 1) {
      this.screen.splice(this.cursor.row, 0, this.blankLine());
      this.screen.splice(this.scrollBottom + 1, 1);
    }
  }

  private deleteLines(count: number) {
    if (
      this.cursor.row < this.scrollTop ||
      this.cursor.row > this.scrollBottom
    ) {
      return;
    }

    const amount = Math.min(count, this.scrollBottom - this.cursor.row + 1);
    for (let index = 0; index < amount; index += 1) {
      this.screen.splice(this.cursor.row, 1);
      this.screen.splice(this.scrollBottom, 0, this.blankLine());
    }
  }

  private scrollUp(
    count: number,
    top = this.scrollTop,
    bottom = this.scrollBottom,
  ) {
    const amount = Math.min(count, bottom - top + 1);
    for (let index = 0; index < amount; index += 1) {
      const removed = this.screen.splice(top, 1)[0] || this.blankLine();
      if (top === 0 && !this.alternateState) {
        this.scrollback.push(this.lineToString(removed));
      }
      this.screen.splice(bottom, 0, this.blankLine());
    }
    this.pruneScrollback();
  }

  private scrollDown(
    count: number,
    top = this.scrollTop,
    bottom = this.scrollBottom,
  ) {
    const amount = Math.min(count, bottom - top + 1);
    for (let index = 0; index < amount; index += 1) {
      this.screen.splice(bottom, 1);
      this.screen.splice(top, 0, this.blankLine());
    }
  }

  private setScrollRegion(top?: number, bottom?: number) {
    const nextTop = clamp((top ?? 1) - 1, 0, this.rows - 1);
    const nextBottom = clamp((bottom ?? this.rows) - 1, nextTop, this.rows - 1);
    this.scrollTop = nextTop;
    this.scrollBottom = nextBottom;
    this.cursor = { row: 0, col: 0 };
  }

  private createBlankScreen(rows: number) {
    return Array.from({ length: rows }, () => this.blankLine());
  }

  private blankLine() {
    return Array(this.cols).fill(" ");
  }

  private stringToLine(value: string) {
    const line = value.slice(0, this.cols).split("");
    while (line.length < this.cols) line.push(" ");
    return line;
  }

  private lineToString(line: string[]) {
    return line.join("").replace(/\s+$/g, "");
  }

  private fillLineRange(line: string[], start: number, end: number) {
    const safeStart = clamp(start, 0, this.cols - 1);
    const safeEnd = clamp(end, safeStart, this.cols - 1);
    for (let index = safeStart; index <= safeEnd; index += 1) {
      line[index] = " ";
    }
  }

  private getRenderableLines() {
    const screenLines = this.screen.map((line) => this.lineToString(line));
    let lastScreenLine = Math.max(0, this.cursor.row);
    for (let index = screenLines.length - 1; index >= 0; index -= 1) {
      if (screenLines[index].length > 0) {
        lastScreenLine = Math.max(lastScreenLine, index);
        break;
      }
    }

    const lines = [
      ...this.scrollback,
      ...screenLines.slice(0, lastScreenLine + 1),
    ];
    return lines.length > 0 ? lines : [""];
  }

  private pruneScrollback() {
    let totalLength = this.scrollback.reduce(
      (sum, line) => sum + line.length + 1,
      0,
    );
    while (totalLength > this.maxBufferChars && this.scrollback.length > 0) {
      const removed = this.scrollback.shift() || "";
      totalLength -= removed.length + 1;
    }
  }
}
