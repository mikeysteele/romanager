export class CliError extends Error {
  constructor(message: string, public readonly exitCode: number = 1) {
    super(message);
    this.name = "CliError";
  }
}

export class PartialSyncError extends CliError {
  constructor(message: string) {
    super(message, 2);
    this.name = "PartialSyncError";
  }
}

export class ServerUnreachableError extends CliError {
  constructor(message: string) {
    super(message, 3);
    this.name = "ServerUnreachableError";
  }
}

export class InsufficientDiskSpaceError extends CliError {
  constructor(message: string) {
    super(message, 4);
    this.name = "InsufficientDiskSpaceError";
  }
}

export class ConfigError extends CliError {
  constructor(message: string) {
    super(message, 5);
    this.name = "ConfigError";
  }
}

export class AuthError extends CliError {
  constructor(message: string) {
    super(message, 6);
    this.name = "AuthError";
  }
}
