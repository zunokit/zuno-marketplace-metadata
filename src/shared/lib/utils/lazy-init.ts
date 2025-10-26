/**
 * Lazy Initialization Utility
 *
 * Provides a generic pattern for deferring expensive object creation
 * until first access. Prevents build-time initialization errors.
 *
 * Use cases:
 * - Database clients
 * - Redis connections
 * - External service clients (ImageKit, Pinata, etc.)
 * - Any resource that requires runtime configuration
 *
 * @example
 * ```ts
 * const getRedis = createLazyInitializer(() => new Redis({
 *   url: env.REDIS_URL,
 *   token: env.REDIS_TOKEN
 * }));
 *
 * // Redis is not created until first call
 * const client = getRedis();
 * ```
 */

type Initializer<T> = () => T;

/**
 * Creates a lazy initializer function
 *
 * @param factory - Function that creates the instance
 * @returns Function that returns the lazily-initialized instance
 *
 * Thread-safe for single-threaded JavaScript environments
 * Instance is cached after first initialization
 */
export function createLazyInitializer<T>(factory: Initializer<T>): () => T {
  let instance: T | null = null;
  let isInitializing = false;

  return (): T => {
    // Prevent re-initialization during factory execution
    if (isInitializing) {
      throw new Error("Circular dependency detected in lazy initializer");
    }

    if (instance === null) {
      isInitializing = true;
      try {
        instance = factory();
      } finally {
        isInitializing = false;
      }
    }

    return instance;
  };
}

/**
 * Creates a lazy getter property descriptor
 *
 * Useful for class properties or object getters that should be
 * lazily initialized on first access
 *
 * @example
 * ```ts
 * class MyService {
 *   static get client() {
 *     return lazyGetter(() => new ExpensiveClient());
 *   }
 * }
 * ```
 */
export function lazyGetter<T>(factory: Initializer<T>): T {
  const getInstance = createLazyInitializer(factory);
  return getInstance();
}

/**
 * Decorator for lazy property initialization (experimental)
 *
 * @example
 * ```ts
 * class MyClass {
 *   @Lazy(() => new ExpensiveResource())
 *   resource!: ExpensiveResource;
 * }
 * ```
 */
export function Lazy<T>(factory: Initializer<T>) {
  const instances = new WeakMap<object, T>();

  return function (target: object, propertyKey: string | symbol): void {
    Object.defineProperty(target, propertyKey, {
      get(this: object): T {
        if (!instances.has(this)) {
          instances.set(this, factory());
        }
        return instances.get(this)!;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Creates a resettable lazy initializer
 *
 * Allows manual reset of the cached instance (useful for testing)
 *
 * @returns Object with `get()` and `reset()` methods
 */
export function createResettableLazyInitializer<T>(
  factory: Initializer<T>
): {
  get: () => T;
  reset: () => void;
  isInitialized: () => boolean;
} {
  let instance: T | null = null;

  return {
    get: (): T => {
      if (instance === null) {
        instance = factory();
      }
      return instance;
    },
    reset: (): void => {
      instance = null;
    },
    isInitialized: (): boolean => {
      return instance !== null;
    },
  };
}

/**
 * Async version of lazy initializer
 *
 * For resources that require async initialization (e.g., database connections)
 *
 * @example
 * ```ts
 * const getDb = createAsyncLazyInitializer(async () => {
 *   const client = await connectToDatabase();
 *   return client;
 * });
 *
 * const db = await getDb();
 * ```
 */
export function createAsyncLazyInitializer<T>(
  factory: () => Promise<T>
): () => Promise<T> {
  let instance: T | null = null;
  let initPromise: Promise<T> | null = null;

  return async (): Promise<T> => {
    if (instance !== null) {
      return instance;
    }

    // If initialization is in progress, wait for it
    if (initPromise !== null) {
      return initPromise;
    }

    initPromise = factory().then((result) => {
      instance = result;
      initPromise = null;
      return result;
    });

    return initPromise;
  };
}
