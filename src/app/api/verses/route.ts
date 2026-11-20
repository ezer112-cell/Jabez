import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { INITIAL_VERSES, VerseCard } from "@/utils/grading";
import { getSyncKey } from "@/utils/ghConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GITHUB_OWNER = "ezer112-cell";
const GITHUB_REPO = "Jabez";
const GITHUB_FILE_PATH = "data/verses.json";
const GITHUB_BRANCH = "main";
const ADMIN_PIN = "1234";

function getGitHubToken(): string {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  try {
    return getSyncKey().trim();
  } catch {
    return "";
  }
}

async function readLocalVersesFile(): Promise<VerseCard[] | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "verses.json");
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * GET /api/verses
 * 1) GitHub 저장소의 최신 data/verses.json을 실시간으로 조회하여 모든 사용자의 기기에 즉시 최신 말씀을 제공합니다.
 * 2) 네트워크 실패 시 로컬 data/verses.json 또는 INITIAL_VERSES를 반환합니다.
 */
export async function GET() {
  const token = getGitHubToken();

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "Cache-Control": "no-cache",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.content) {
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return NextResponse.json({
            verses: parsed,
            source: "github-live",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Fall back to local file below
  }

  const localVerses = await readLocalVersesFile();
  return NextResponse.json({
    verses: localVerses || INITIAL_VERSES,
    source: "local",
    updatedAt: new Date().toISOString(),
  });
}

/**
 * POST /api/verses
 * 관리자(비밀번호 1234)가 말씀을 추가/수정/삭제하거나 하단의 '전체 공유 및 재배포' 버튼을 누르면
 * 1) 로컬 data/verses.json 업데이트 (로컬 개발 환경인 경우)
 * 2) GitHub 저장소(ezer112-cell/Jabez)의 data/verses.json을 즉시 커밋하여
 *    - 다른 사람들의 핸드폰에서도 1초 만에 실시간으로 최신 말씀이 보이게 하고,
 *    - 동시에 Vercel이 새 커밋을 감지해 자동 재배포까지 수행하도록 합니다.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, verses, message } = body as {
      pin?: string;
      verses?: VerseCard[];
      message?: string;
    };

    if (pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: "관리자 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    if (!Array.isArray(verses)) {
      return NextResponse.json(
        { error: "올바른 말씀 목록 데이터가 아닙니다." },
        { status: 400 }
      );
    }

    const sortedVerses = [...verses].sort((a, b) => a.order - b.order);
    const jsonString = JSON.stringify(sortedVerses, null, 2) + "\n";

    // 1. 로컬 파일 저장 시도 (로컬 서버 실행 시 즉시 파일 반영)
    try {
      const localPath = path.join(process.cwd(), "data", "verses.json");
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, jsonString, "utf-8");
    } catch {
      // Vercel 서버리스 환경에서는 읽기 전용 파일시스템이므로 무시하고 GitHub API로 저장
    }

    // 2. GitHub Contents API를 통해 data/verses.json 커밋 (실시간 전체 공유 + Vercel 자동 재배포 트리거)
    const token = getGitHubToken();
    if (!token) {
      return NextResponse.json(
        {
          ok: true,
          syncedToGitHub: false,
          verses: sortedVerses,
          warning: "로컬에만 저장되었습니다 (GitHub 토큰 없음).",
        },
        { status: 200 }
      );
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    const headers = {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 기존 파일의 SHA 조회
    let existingSha: string | undefined;
    const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
      headers,
      cache: "no-store",
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      existingSha = existingData.sha;
    }

    const commitMessage =
      message ||
      `Update scripture verses (${sortedVerses.length} verses) via Admin Web UI`;

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(jsonString, "utf-8").toString("base64"),
        branch: GITHUB_BRANCH,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return NextResponse.json(
        {
          error: `GitHub 동기화 실패: ${putRes.status}`,
          details: errText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      syncedToGitHub: true,
      verses: sortedVerses,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "서버 저장 중 오류가 발생했습니다.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
