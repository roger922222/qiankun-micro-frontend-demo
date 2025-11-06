import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

// OpenTelemetry配置
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
});

// 创建资源
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'product-bff',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'qiankun-micro-frontend',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// 创建SDK
const sdk = new NodeSDK({
  resource,
  traceExporter: otlpExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-net': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/health'],
        ignoreOutgoingUrls: [/localhost:4318/],
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

// 初始化SDK
export function initializeTracing() {
  try {
    sdk.start();
    console.log('✅ OpenTelemetry tracing initialized');
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry tracing:', error);
  }
}

// 关闭SDK
export async function shutdownTracing() {
  try {
    await sdk.shutdown();
    console.log('✅ OpenTelemetry tracing shutdown');
  } catch (error) {
    console.error('❌ Failed to shutdown OpenTelemetry tracing:', error);
  }
}

// 创建跟踪器
const tracer = trace.getTracer('product-bff', '2.0.0');

/**
 * 创建跟踪包装器
 */
export function traceFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  attributes: Record<string, any> = {}
): T {
  return ((...args: Parameters<T>) => {
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }) as T;
}

/**
 * 创建数据库操作跟踪
 */
export function traceDatabaseOperation<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `db.${operation}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.sql.table': table,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Database error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 创建Redis操作跟踪
 */
export function traceRedisOperation<T>(
  operation: string,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `redis.${operation}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': operation,
        'db.redis.database_index': 0,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Redis error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 创建HTTP请求跟踪
 */
export function traceHttpRequest<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `http.${method.toLowerCase()}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.scheme': 'http',
        'http.host': process.env.HOST || 'localhost',
        'http.target': url,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'HTTP error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 创建业务操作跟踪
 */
export function traceBusinessOperation<T>(
  operation: string,
  attributes: Record<string, any> = {},
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `business.${operation}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.type': operation,
        ...attributes,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Business error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 创建缓存操作跟踪
 */
export function traceCacheOperation<T>(
  operation: string,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `cache.${operation}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'cache.operation': operation,
        'cache.key': key,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Cache error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 性能监控跟踪
 */
export function tracePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `performance.${operation}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'performance.operation': operation,
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('performance.duration_ms', duration);
        
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Performance error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 限流操作跟踪
 */
export function traceRateLimit<T>(
  operation: string,
  endpoint: string,
  allowed: boolean,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `ratelimit.${operation}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'ratelimit.operation': operation,
        'ratelimit.endpoint': endpoint,
        'ratelimit.allowed': allowed,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Rate limit error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 错误跟踪
 */
export function traceError(
  error: Error,
  context: Record<string, any> = {}
): void {
  const span = tracer.startSpan('error');
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
  span.setAttributes({
    'error.type': error.name,
    'error.message': error.message,
    'error.stack': error.stack || '',
    ...context,
  });
  span.end();
}

/**
 * 自定义跟踪
 */
export function createCustomSpan<T>(
  name: string,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, any>;
    parent?: any;
  } = {},
  fn: (span: any) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes || {},
    },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 获取当前跟踪上下文
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}

/**
 * 获取当前跨度ID
 */
export function getCurrentSpanId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().spanId;
}

/**
 * 跟踪上下文传播
 */
export function withTraceContext<T>(
  traceId: string,
  spanId: string,
  fn: () => T
): T {
  const spanContext = {
    traceId,
    spanId,
    traceFlags: 1,
    isRemote: true,
  };
  
  const span = tracer.startSpan('propagated', {}, trace.setSpan(context.active(), spanContext));
  
  try {
    return context.with(trace.setSpan(context.active(), span), fn);
  } finally {
    span.end();
  }
}

export {
  tracer,
  trace,
  context,
  SpanStatusCode,
  SpanKind,
};