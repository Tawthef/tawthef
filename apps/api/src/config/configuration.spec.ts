import { environmentSchema } from './environment.schema';
import configuration from './configuration';

describe('environmentSchema', () => {
  describe('valid input', () => {
    it('accepts a complete valid development config', () => {
      const result = environmentSchema.safeParse({
        NODE_ENV: 'development',
        PORT: '4000',
        LOG_LEVEL: 'log',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(4000);
        expect(result.data.LOG_LEVEL).toBe('log');
      }
    });

    it('applies defaults when optional variables are absent', () => {
      const result = environmentSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(4000);
        expect(result.data.LOG_LEVEL).toBe('log');
      }
    });

    it('coerces a string PORT to a number', () => {
      const result = environmentSchema.safeParse({ PORT: '8080' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
        expect(typeof result.data.PORT).toBe('number');
      }
    });

    it('accepts all valid NODE_ENV values', () => {
      for (const value of ['development', 'test', 'production'] as const) {
        const result = environmentSchema.safeParse({ NODE_ENV: value });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid LOG_LEVEL values', () => {
      for (const value of ['error', 'warn', 'log', 'debug', 'verbose'] as const) {
        const result = environmentSchema.safeParse({ LOG_LEVEL: value });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid input', () => {
    it('rejects an invalid NODE_ENV', () => {
      const result = environmentSchema.safeParse({ NODE_ENV: 'staging' });
      expect(result.success).toBe(false);
    });

    it('rejects a non-numeric PORT', () => {
      const result = environmentSchema.safeParse({ PORT: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects a PORT below range', () => {
      const result = environmentSchema.safeParse({ PORT: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects a PORT above range', () => {
      const result = environmentSchema.safeParse({ PORT: '99999' });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid LOG_LEVEL', () => {
      const result = environmentSchema.safeParse({ LOG_LEVEL: 'info' });
      expect(result.success).toBe(false);
    });
  });
});

describe('configuration()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns nested app config with defaults', () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;

    const config = configuration();
    const app = config['app'] as Record<string, unknown>;

    expect(app.nodeEnv).toBe('development');
    expect(app.port).toBe(4000);
    expect(app.logLevel).toBe('log');
  });

  it('reads PORT from environment as a number', () => {
    process.env.PORT = '4100';
    const config = configuration();
    const app = config['app'] as Record<string, unknown>;
    expect(app.port).toBe(4100);
    expect(typeof app.port).toBe('number');
  });

  it('throws a descriptive error for an invalid PORT', () => {
    process.env.PORT = 'notaport';
    expect(() => configuration()).toThrow('Invalid environment configuration');
  });
});
