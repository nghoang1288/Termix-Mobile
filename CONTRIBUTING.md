# Contributing to SSHBridge Mobile

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) 20 or newer
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Git](https://git-scm.com/downloads)
- Android Studio / Android SDK for Android builds

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/nghoang1288/SSHBridge-Mobile
   cd SSHBridge-Mobile
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

## Running the development server

```sh
npm run start
```

This starts the Expo development server. Use a development build for native
modules and terminal features.

## Checks Before Opening a PR

```sh
npx tsc --noEmit
npm audit --omit=dev
```

For Android release changes, also run:

```powershell
cd android
.\gradlew.bat assembleRelease
```

## Contributing

1. **Fork the repository**: Click the "Fork" button at the top right of
   the [repository page](https://github.com/nghoang1288/SSHBridge-Mobile).
2. **Create a new branch**:

   ```sh
   git checkout -b feature/my-new-feature
   ```

3. **Make your changes**: Implement your feature, fix, or improvement.
4. **Commit your changes**:

   ```sh
   git commit -m "Add my new feature"
   ```

5. **Push to your fork**:

   ```sh
   git push origin feature/my-new-feature
   ```

6. **Open a pull request**: Go to the original repository and create a PR with a clear description.

For UI work, include screenshots or a short demo recording. For security or
storage changes, describe migration behavior and any residual risk.

## Support

If you need help or want to request a feature, open an issue at
[SSHBridge-Mobile issues](https://github.com/nghoang1288/SSHBridge-Mobile/issues).
Include device model, Android/iOS version, app version, connection mode, and
steps to reproduce.
