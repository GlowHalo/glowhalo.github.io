/**
 * GlowHalo 공용 Worker 유틸 — Gemini(및 유사 업스트림) 호출에 타임아웃·재시도를 붙인다.
 *
 * 왜 공용으로 뺐나 (2026-08-25, GlowHalo 6):
 * 그룹 전체가 하나의 무료 티어 `gemini_api_key`(금고)를 공유한다 — 지금 기준 이 키를
 * `glowhalo6-mindmap`·`glowhalo6-kpc-coach-chat`·`glowhalo6-coach-practice` 세 Worker가 같이 쓴다.
 * 그래서 업스트림이 느려지거나 할당량이 마르면 **세 앱이 동시에** 영향을 받는데, 타임아웃이
 * 없는 Worker는 응답을 영영 못 주고 그냥 매달린다(2026-08-25 실측: mindmap·kpc는 45~100초
 * 넘게 무응답, 타임아웃이 있던 coach-practice만 62초 뒤 명확한 에러로 끝남).
 * 사용자 입장에서 "느리지만 언젠가 오겠지"와 "지금 안 된다"는 완전히 다른 경험이라,
 * 이 패턴을 한 곳에 두고 세 Worker가 같이 쓰도록 했다.
 *
 * 다른 계열사 Worker도 그대로 재사용 가능하다 — 상대경로로 import하면 wrangler(esbuild)가
 * 번들에 포함시킨다. 예: import { fetchJsonWithRetry } from "../../shared/worker-utils/gemini-fetch";
 */

export interface RetryOptions {
  /** 한 번의 시도가 이 시간을 넘기면 중단한다(ms). */
  timeoutMs?: number;
  /** 최초 시도 이후 추가로 재시도할 횟수. */
  maxRetries?: number;
  /** 재시도 사이 대기의 기준값(ms) — n번째 재시도는 base*(n+1)만큼 쉰다. */
  retryBaseMs?: number;
}

// 대화형 UI가 붙는 호출이라 "결국 성공"보다 "빨리 명확히 실패"가 낫다 —
// 최악의 경우에도 사용자가 30초 안에는 결과(또는 안내)를 본다.
const DEFAULTS: Required<RetryOptions> = {
  timeoutMs: 15_000,
  maxRetries: 1,
  retryBaseMs: 400,
};

/** 일시적 장애로 보고 재시도할 가치가 있는 상태 코드인가. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * 업스트림이 끝내 응답하지 않았을 때 던지는 에러.
 * `AbortError`의 기본 메시지("The operation was aborted")는 사용자에게 아무 정보가 안 되므로,
 * 호출부가 그대로 사용자에게 노출해도 뜻이 통하는 문장으로 바꿔서 던진다.
 */
/**
 * 무료 티어 할당량이 마른 경우(429). 그룹이 공용 키 하나를 쓰기 때문에 한 앱이 다 쓰면
 * 나머지 앱도 같이 막힌다 — 사용자에게는 원문 JSON 대신 "지금 왜 안 되는지 + 무엇을 하면 되는지"를
 * 알려주고, 재시도로 시간을 더 끌지 않는다(하루 한도는 몇 초 기다린다고 풀리지 않는다).
 */
export class UpstreamQuotaError extends Error {
  constructor() {
    super(
      "공용 무료 AI 키의 하루 사용량을 다 썼습니다(그룹의 여러 앱이 이 키를 함께 씁니다). " +
        "내일 다시 시도하시거나, 설정에서 본인 Gemini API 키를 등록하면 한도 없이 바로 쓰실 수 있습니다."
    );
    this.name = "UpstreamQuotaError";
  }
}

export class UpstreamTimeoutError extends Error {
  constructor(attempts: number, timeoutMs: number) {
    super(
      `AI 서버가 응답하지 않습니다(${attempts}회 시도, 각 ${Math.round(timeoutMs / 1000)}초 대기). ` +
        `일시적 혼잡이거나 공용 무료 키의 하루 한도를 넘겼을 수 있습니다 — 잠시 후 다시 시도하거나 본인 API 키를 등록해 주세요.`
    );
    this.name = "UpstreamTimeoutError";
  }
}

/**
 * POST로 JSON을 보내고 JSON을 받는다. 타임아웃 + (429/5xx/타임아웃 한정) 재시도 포함.
 * 응답 본문 해석은 호출부가 하도록 파싱된 객체를 그대로 돌려준다.
 *
 * 재시도는 "이번 입력에 대한 생성 결과를 받아온다"는 순수 조회성 호출을 전제로 한다 —
 * 서버 상태를 바꾸는 POST에는 그대로 쓰지 말 것.
 */
export async function fetchJsonWithRetry(
  url: string,
  body: unknown,
  options: RetryOptions = {}
): Promise<any> {
  const { timeoutMs, maxRetries, retryBaseMs } = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        // 429는 두 가지가 섞여 온다: 분당 속도 제한(잠깐 쉬면 풀림)과 일일 할당량 소진(안 풀림).
        // 후자는 재시도해봐야 같은 벽에 부딪히므로 그 자리에서 사용자에게 설명하고 끝낸다.
        if (res.status === 429 && /quota|RESOURCE_EXHAUSTED/i.test(errText)) {
          throw new UpstreamQuotaError();
        }
        const err = new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
        (err as any).retryable = isRetryableStatus(res.status);
        throw err;
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof Error && error.name === "AbortError";
      // 타임아웃이 마지막 시도까지 이어졌다면, 의미 없는 AbortError 대신 설명되는 에러로 바꿔 던진다.
      if (isAbort && attempt === maxRetries) throw new UpstreamTimeoutError(maxRetries + 1, timeoutMs);
      const retryable = isAbort || (error as any)?.retryable === true;
      if (!retryable || attempt === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, retryBaseMs * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
