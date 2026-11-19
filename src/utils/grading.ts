export interface VerseCard {
  id: string;
  order: number; // 몇번째 (예: 1, 2, 3...)
  reference: string; // 구절주소 (예: 역대상 4:10)
  text: string; // 말씀 내용
}

export interface DiffPart {
  value: string;
  type: "equal" | "wrong" | "missing";
}

export interface GradeResult {
  isPerfect: boolean;
  accuracy: number;
  userDiff: DiffPart[];
  targetText: string;
  userText: string;
}

/**
 * 글자 단위 LCS(최장 공통 부분 수열) 기반 정밀 비교
 * 맞춤법과 띄어쓰기까지 모두 채점하며,
 * 사용자가 입력한 텍스트 중 틀린 글자/띄어쓰기는 "wrong"으로,
 * 빠뜨린 글자/띄어쓰기는 "missing"으로 표시합니다.
 */
export function gradeVerse(targetRaw: string, userRaw: string): GradeResult {
  // 줄바꿈만 단일 공백으로 통일하고 양끝 공백만 제거 (내부 띄어쓰기, 맞춤법은 엄격 비교)
  const target = targetRaw.replace(/\r?\n/g, " ").trim();
  const user = userRaw.replace(/\r?\n/g, " ").trim();

  if (target === user) {
    return {
      isPerfect: true,
      accuracy: 100,
      userDiff: [{ value: user, type: "equal" }],
      targetText: target,
      userText: user,
    };
  }

  const m = target.length;
  const n = user.length;

  // DP 테이블 생성
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (target[i - 1] === user[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 역추적하여 사용자 입력 기준 틀린 부분 및 누락 표시 생성
  let i = m;
  let j = n;
  const rawOps: DiffPart[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === user[j - 1]) {
      rawOps.push({ value: user[j - 1], type: "equal" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // 사용자가 틀리게 입력하거나 추가로 입력한 글자 (띄어쓰기 오류 포함)
      const ch = user[j - 1] === " " ? "␣" : user[j - 1];
      rawOps.push({ value: ch, type: "wrong" });
      j--;
    } else {
      // 정답에 있는데 사용자가 빠뜨린 글자
      const ch = target[i - 1] === " " ? "␣" : target[i - 1];
      rawOps.push({ value: ch, type: "missing" });
      i--;
    }
  }

  rawOps.reverse();

  // 연속된 같은 타입 합치기
  const merged: DiffPart[] = [];
  for (const op of rawOps) {
    if (merged.length > 0 && merged[merged.length - 1].type === op.type) {
      merged[merged.length - 1].value += op.value;
    } else {
      merged.push({ ...op });
    }
  }

  const lcsLen = dp[m][n];
  const maxLen = Math.max(m, n, 1);
  const accuracy = Math.round((lcsLen / maxLen) * 100);

  return {
    isPerfect: false,
    accuracy,
    userDiff: merged,
    targetText: target,
    userText: user,
  };
}

export const INITIAL_VERSES: VerseCard[] = [
  {
    id: "default-1",
    order: 1,
    reference: "창세기 22:17",
    text: "내가 네게 큰 복을 주고 네 씨가 크게 번성하여 하늘의 별과 같고 바닷가의 모래와 같게 하리니 네 씨가 그 대적의 성문을 차지하리라",
  },
  {
    id: "default-2",
    order: 2,
    reference: "역대상 4:10",
    text: "야베스가 이스라엘 하나님께 아뢰어 이르되 주께서 내게 복을 주시려거든 나의 지역을 넓히시고 주의 손으로 나를 도우사 나로 환난을 벗어나 내게 근심이 없게 하옵소서 하였더니 하나님이 그가 구하는 것을 허락하셨더라",
  },
  {
    id: "default-3",
    order: 3,
    reference: "예레미야 33:3",
    text: "너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 은밀한 일을 네게 보이리라",
  },
];
