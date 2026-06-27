export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
}

export interface DatabaseConfig {
  enabled: boolean;
  url: string | undefined;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
}
