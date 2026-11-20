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
    id: "jabez-2026-1",
    order: 1,
    reference: "창세기 22:12",
    text: "사자가 이르시되 그 아이에게 네 손을 대지 말라 그에게 아무 일도 하지 말라 네가 네 아들 네 독자까지도 내게 아끼지 아니하였으니 내가 이제야 네가 하나님을 경외하는 줄을 아노라",
  },
  {
    id: "jabez-2026-2",
    order: 2,
    reference: "로마서 4:17",
    text: "기록된 바 내가 너를 많은 민족의 조상으로 세웠다 하심과 같으니 그가 믿은 바 하나님은 죽은 자를 살리시며 없는 것을 있는 것으로 부르시는 이시니라",
  },
  {
    id: "jabez-2026-3",
    order: 3,
    reference: "이사야 51:3",
    text: "나 여호와가 시온의 모든 황폐한 곳들을 위로하여 그 사막을 에덴 같게 그 광야를 여호와의 동산 같게 하였나니 그 가운데에 기뻐함과 즐거워함과 감사함과 창화하는 소리가 있으리라",
  },
  {
    id: "jabez-2026-4",
    order: 4,
    reference: "히브리서 6:14-15",
    text: "이르시되 내가 반드시 너에게 복 주고 복 주며 너를 번성하게 하고 번성하게 하리라 하셨더니 그가 이같이 오래 참아 약속을 받았느니라",
  },
  {
    id: "jabez-2026-5",
    order: 5,
    reference: "창세기 18:18",
    text: "아브라함은 강대한 나라가 되고 천하 만민은 그로 말미암아 복을 받게 될 것이 아니냐",
  },
  {
    id: "jabez-2026-6",
    order: 6,
    reference: "이사야 41:10",
    text: "두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라",
  },
  {
    id: "jabez-2026-7",
    order: 7,
    reference: "히브리서 11:19",
    text: "그가 하나님이 능히 이삭을 죽은 자 가운데서 다시 살리실 줄로 생각한지라 비유컨대 그를 죽은 자 가운데서 도로 받은 것이니라",
  },
  {
    id: "jabez-2026-8",
    order: 8,
    reference: "요한삼서 1:4",
    text: "내가 내 자녀들이 진리 안에서 행한다 함을 듣는 것보다 더 기쁜 일이 없도다",
  },
  {
    id: "jabez-2026-9",
    order: 9,
    reference: "시편 145:19",
    text: "그는 자기를 경외하는 자들의 소원을 이루시며 또 그들의 부르짖음을 들으사 구원하시리로다",
  },
  {
    id: "jabez-2026-10",
    order: 10,
    reference: "이사야 28:29",
    text: "이도 만군의 여호와께로부터 난 것이라 그의 경영은 기묘하며 지혜는 광대하니라",
  },
  {
    id: "jabez-2026-11",
    order: 11,
    reference: "마태복음 8:13",
    text: "예수께서 백부장에게 이르시되 가라 네 믿은 대로 될지어다 하시니 그 즉시 하인이 나으니라",
  },
  {
    id: "jabez-2026-12",
    order: 12,
    reference: "마가복음 4:39",
    text: "예수께서 깨어 바람을 꾸짖으시며 바다더러 이르시되 잠잠하라 고요하라 하시니 바람이 그치고 아주 잔잔하여지더라",
  },
];
