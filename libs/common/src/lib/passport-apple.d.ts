declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';

  interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    callbackURL: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyLocation?: string;
    passReqToCallback?: boolean;
    scope?: string[];
  }

  class Strategy extends PassportStrategy {
    constructor(
      options: AppleStrategyOptions,
      verify: (...args: any[]) => void,
    );
  }
}
