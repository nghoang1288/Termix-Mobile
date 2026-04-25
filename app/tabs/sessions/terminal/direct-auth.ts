type DirectAuthType = "password" | "key" | "credential" | "none";

export type DirectAuthConfigBase = {
  username: string;
  authType: DirectAuthType;
  password?: string | null;
  key?: string | null;
  privateKey?: string | null;
  sshKey?: string | null;
  keyPassword?: string | null;
  keyType?: string | null;
  credentialId?: number | null;
  overrideCredentialUsername?: boolean | null;
};

type CredentialDetails = {
  username?: string | null;
  authType?: DirectAuthType | null;
  password?: string | null;
  key?: string | null;
  privateKey?: string | null;
  private_key?: string | null;
  sshKey?: string | null;
  keyPassword?: string | null;
  key_password?: string | null;
  keyType?: string | null;
  detectedKeyType?: string | null;
  credential?: CredentialDetails;
  data?: CredentialDetails;
};

export function normalizeDirectAuthConfig<T extends DirectAuthConfigBase>(
  config: T,
): T {
  if (config.authType !== "credential") {
    return config;
  }

  if (hasText(config.password)) {
    return {
      ...config,
      authType: "password",
    };
  }

  if (
    hasText(config.key) ||
    hasText(config.privateKey) ||
    hasText(config.sshKey)
  ) {
    return {
      ...config,
      authType: "key",
    };
  }

  return config;
}

export function mergeCredentialDetails<T extends DirectAuthConfigBase>(
  host: T,
  credentialResponse: CredentialDetails,
): T {
  const credential = unwrapCredentialDetails(credentialResponse);
  const privateKey = firstText(
    credential.key,
    credential.privateKey,
    credential.private_key,
    credential.sshKey,
    host.key,
    host.privateKey,
    host.sshKey,
  );
  const authType =
    credential.authType === "password" || credential.authType === "key"
      ? credential.authType
      : host.authType;

  return normalizeDirectAuthConfig({
    ...host,
    username: host.overrideCredentialUsername
      ? host.username
      : firstText(credential.username, host.username) || host.username,
    authType,
    password: firstText(credential.password, host.password),
    key: privateKey,
    privateKey,
    sshKey: privateKey,
    keyPassword: firstText(
      credential.keyPassword,
      credential.key_password,
      host.keyPassword,
    ),
    keyType: firstText(
      credential.keyType,
      credential.detectedKeyType,
      host.keyType,
    ),
  } as T);
}

export function directAuthUnavailable<T extends DirectAuthConfigBase>(
  host: T,
): T {
  return {
    ...host,
    authType: "none",
  };
}

function firstText(
  ...values: (string | null | undefined)[]
): string | undefined {
  return values.find(hasText);
}

function unwrapCredentialDetails(
  credential: CredentialDetails,
): CredentialDetails {
  if (credential.credential && typeof credential.credential === "object") {
    return credential.credential;
  }

  if (credential.data && typeof credential.data === "object") {
    return credential.data;
  }

  return credential;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
