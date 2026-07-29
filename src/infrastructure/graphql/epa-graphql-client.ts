/**
 * Cliente GraphQL de propósito general. A propósito NO sabe nada de
 * "productos" ni de EPA en particular - eso es trabajo del repository.
 * Esta clase solo sabe hablar el protocolo GraphQL sobre HTTP.
 */

// User-Agent de navegador real. Sin esto, CloudFront/WAF devuelve un
// 403 con una página de "mantenimiento" en vez de la respuesta real
// (confirmado empíricamente el 27/07/2026 - ver notas del proyecto).
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface GraphQLError {
  message: string;
}

interface GraphQLResponseBody<T> {
  data?: T;
  errors?: GraphQLError[];
}

export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

export class GraphQLClient {
  constructor(
    private readonly endpoint: string,
    private readonly userAgent: string = DEFAULT_USER_AGENT,
  ) {}

  async request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
  ): Promise<TData> {
    let response: Response;

    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (err) {
      throw new GraphQLRequestError(
        `No se pudo conectar a ${this.endpoint}: ${(err as Error).message}`,
        err,
      );
    }

    if (!response.ok) {
      throw new GraphQLRequestError(
        `Respuesta HTTP ${response.status} ${response.statusText} de ${this.endpoint}. ` +
          `Si es un 403, probablemente el WAF bloqueó la request (revisa el User-Agent).`,
      );
    }

    const body = (await response.json()) as GraphQLResponseBody<TData>;

    if (body.errors?.length) {
      throw new GraphQLRequestError(
        `Errores GraphQL: ${body.errors.map((e) => e.message).join("; ")}`,
      );
    }

    if (!body.data) {
      throw new GraphQLRequestError("La respuesta GraphQL no trajo 'data'.");
    }

    return body.data;
  }
}
