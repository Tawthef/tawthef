import { environmentSchema } from './environment.schema';

export default (): Record<string, unknown> => {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `  ${e.path.join('.') || 'value'}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  const { NODE_ENV, PORT, LOG_LEVEL, DATABASE_ENABLED, DATABASE_URL } =
    result.data;

  return {
    app: {
      nodeEnv: NODE_ENV,
      port: PORT,
      logLevel: LOG_LEVEL,
    },
    database: {
      enabled: DATABASE_ENABLED,
      url: DATABASE_URL,
    },
  };
};
