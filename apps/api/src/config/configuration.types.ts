export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
}

export interface Config {
  app: AppConfig;
}
