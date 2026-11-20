"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  StickyNote,
  PenTool,
  GraduationCap,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  RotateCcw,
  Shuffle,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Lightbulb,
  CloudUpload,
  RefreshCw,
} from "lucide-react";
import {
  VerseCard,
  INITIAL_VERSES,
  gradeVerse,
  GradeResult,
} from "@/utils/grading";

type TabType = "cover" | "cards" | "memorize" | "exam";

const STORAGE_KEY = "jabez_2026_verses_v3";
const ADMIN_PIN = "1234";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("cover");
  const [verses, setVerses] = useState<VerseCard[]>(INITIAL_VERSES);
  const [isLoaded, setIsLoaded] = useState(false);

  // 실시간 서버 동기화 / 재배포 상태
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [hasUnsavedServerChanges, setHasUnsavedServerChanges] =
    useState<boolean>(false);

  // 메뉴2: 관리자 보호 및 더보기(접기/펼치기) 상태
  const [isAddPanelOpen, setIsAddPanelOpen] = useState<boolean>(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  // 메뉴2: 말씀카드 입력/수정 상태
  const [orderInput, setOrderInput] = useState<string>("13");
  const [referenceInput, setReferenceInput] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 메뉴3: 암송페이지 상태 (각 카드별 사용자 입력, 힌트 단어 인덱스, 채점 결과)
  const [practiceInputs, setPracticeInputs] = useState<Record<string, string>>(
    {}
  );
  const [hintCounts, setHintCounts] = useState<Record<string, number>>({});
  const [practiceResults, setPracticeResults] = useState<
    Record<string, GradeResult>
  >({});

  // 메뉴4: 시험페이지 상태
  const [examQuestions, setExamQuestions] = useState<VerseCard[]>([]);
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examCurrentInput, setExamCurrentInput] = useState<string>("");
  const [examAnswers, setExamAnswers] = useState<
    { card: VerseCard; userInput: string; result: GradeResult }[]
  >([]);
  const [examStarted, setExamStarted] = useState<boolean>(false);
  const [examFinished, setExamFinished] = useState<boolean>(false);

  // 서버(/api/verses)에서 최신 공유 말씀 불러오기
  const fetchLatestVersesFromServer = useCallback(async (showNotice = false) => {
    try {
      const res = await fetch(`/api/verses?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.verses) && data.verses.length > 0) {
          setVerses(data.verses);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.verses));
          const maxOrder = Math.max(
            ...data.verses.map((v: VerseCard) => v.order),
            0
          );
          setOrderInput(String(maxOrder + 1));
          if (showNotice) {
            setSyncMessage("최신 말씀 목록을 불러왔습니다.");
            setTimeout(() => setSyncMessage(""), 3000);
          }
          return;
        }
      }
    } catch {
      // 오프라인 또는 오류 시 로컬 캐시 사용
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVerses(parsed);
          const maxOrder = Math.max(...parsed.map((v: VerseCard) => v.order), 0);
          setOrderInput(String(maxOrder + 1));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 첫 접속 시 서버에서 실시간 최신 말씀 목록 조회
  useEffect(() => {
    fetchLatestVersesFromServer(false).finally(() => {
      setIsLoaded(true);
    });
  }, [fetchLatestVersesFromServer]);

  // 로컬 스토리지 백업 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
    }
  }, [verses, isLoaded]);

  // 서버(GitHub + Vercel 재배포)에 말씀 목록 저장 및 전체 실시간 공유
  const syncVersesToServer = async (
    targetVerses: VerseCard[],
    actionDescription: string
  ) => {
    setIsSyncing(true);
    setSyncMessage("전체 사용자에게 실시간 공유 및 서버 저장 중...");
    try {
      const res = await fetch("/api/verses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: ADMIN_PIN,
          verses: targetVerses,
          message: actionDescription,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setHasUnsavedServerChanges(false);
        setSyncMessage(
          "✅ 전체 공유 및 재배포 저장 완료! 이제 모든 사람의 핸드폰에 최신 말씀이 보입니다."
        );
      } else {
        setHasUnsavedServerChanges(true);
        setSyncMessage(
          `⚠️ 내 기기에는 저장되었으나 전체 서버 반영에 실패했습니다. 아래 [전체 공유 및 재배포] 버튼을 다시 눌러주세요.`
        );
      }
    } catch {
      setHasUnsavedServerChanges(true);
      setSyncMessage(
        "⚠️ 네트워크 오류로 기기에만 임시 저장되었습니다. 아래 [전체 공유 및 재배포] 버튼을 눌러주세요."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // 날짜/순서(order) 오름차순 정렬된 말씀 목록
  const sortedVerses = [...verses].sort((a, b) => a.order - b.order);

  // 메뉴2: 관리자 비밀번호(1234) 확인
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAdminUnlocked(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError("비밀번호가 일치하지 않습니다.");
    }
  };

  // 관리자 권한이 필요한 액션(수정/삭제/재배포) 호출 시 체크 헬퍼
  const ensureAdminOrPrompt = (): boolean => {
    if (isAdminUnlocked) return true;
    const entered = window.prompt(
      "관리자 전용 기능입니다. 비밀번호를 입력해주세요:"
    );
    if (entered === ADMIN_PIN) {
      setIsAdminUnlocked(true);
      setPinError("");
      return true;
    }
    if (entered !== null) {
      alert("비밀번호가 올바르지 않습니다.");
    }
    return false;
  };

  // 메뉴2: 말씀카드 추가 또는 수정 저장 (저장 즉시 전체 공유 API도 자동 호출)
  const handleAddOrUpdateVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUnlocked) {
      alert("비밀번호 인증 후 추가 및 수정할 수 있습니다.");
      return;
    }

    const orderNum = parseInt(orderInput.replace(/[^0-9]/g, ""), 10);
    if (isNaN(orderNum) || orderNum <= 0) {
      alert("'몇번째' 칸에 숫자를 입력해주세요 (예: 1, 2, 3...)");
      return;
    }
    if (!referenceInput.trim()) {
      alert("'구절주소'를 입력해주세요.");
      return;
    }
    if (!textInput.trim()) {
      alert("'말씀' 내용을 입력해주세요.");
      return;
    }

    let nextVerses: VerseCard[];
    let actionDesc: string;

    if (editingId) {
      nextVerses = verses.map((v) =>
        v.id === editingId
          ? {
              ...v,
              order: orderNum,
              reference: referenceInput.trim(),
              text: textInput.trim(),
            }
          : v
      );
      actionDesc = `Update Day ${orderNum} (${referenceInput.trim()})`;
      setEditingId(null);
    } else {
      const newCard: VerseCard = {
        id: `verse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        order: orderNum,
        reference: referenceInput.trim(),
        text: textInput.trim(),
      };
      nextVerses = [...verses, newCard];
      actionDesc = `Add Day ${orderNum} (${referenceInput.trim()})`;
    }

    setVerses(nextVerses);

    const nextOrder =
      Math.max(...nextVerses.map((v) => v.order), orderNum) + 1;
    setOrderInput(String(nextOrder));
    setReferenceInput("");
    setTextInput("");

    // 서버에 즉시 실시간 공유 및 재배포 요청
    await syncVersesToServer(nextVerses, actionDesc);
  };

  // 메뉴2: 쪽지 삭제 (관리자 전용, 삭제 즉시 서버 반영)
  const handleDeleteVerse = async (id: string) => {
    if (!ensureAdminOrPrompt()) return;
    const target = verses.find((v) => v.id === id);
    const nextVerses = verses.filter((v) => v.id !== id);
    setVerses(nextVerses);
    if (editingId === id) {
      setEditingId(null);
      setReferenceInput("");
      setTextInput("");
    }
    await syncVersesToServer(
      nextVerses,
      `Delete Day ${target?.order ?? ""} (${target?.reference ?? ""})`
    );
  };

  // 메뉴2: 쪽지 수정 모드로 불러오기 (관리자 전용)
  const handleEditSelect = (card: VerseCard) => {
    if (!ensureAdminOrPrompt()) return;
    setIsAddPanelOpen(true);
    setEditingId(card.id);
    setOrderInput(String(card.order));
    setReferenceInput(card.reference);
    setTextInput(card.text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 메뉴2 하단: '전체 공유 및 재배포 (모든 사람에게 최신화)' 버튼 핸들러
  const handleManualRedeploySync = async () => {
    if (!ensureAdminOrPrompt()) return;
    await syncVersesToServer(
      verses,
      `Manual sync & redeploy (${verses.length} verses)`
    );
  };

  // 메뉴3: 힌트 버튼 클릭 시 처음부터 한 단어씩 입력란에 채워넣기
  const handleHintWord = (card: VerseCard) => {
    const words = card.text
      .replace(/\r?\n/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) return;

    const currentInput = (practiceInputs[card.id] || "").trim();
    const currentCount = hintCounts[card.id] || 0;

    let nextCount = currentCount + 1;
    if (!currentInput) {
      nextCount = 1;
    } else {
      const typedWords = currentInput.split(/\s+/).filter(Boolean);
      let matchedPrefix = 0;
      while (
        matchedPrefix < typedWords.length &&
        matchedPrefix < words.length &&
        typedWords[matchedPrefix] === words[matchedPrefix]
      ) {
        matchedPrefix++;
      }
      nextCount = Math.min(
        words.length,
        Math.max(matchedPrefix + 1, currentCount + 1)
      );
    }

    const hintText = words.slice(0, nextCount).join(" ");
    setHintCounts((prev) => ({
      ...prev,
      [card.id]: nextCount,
    }));
    setPracticeInputs((prev) => ({
      ...prev,
      [card.id]: hintText,
    }));
  };

  // 메뉴3: 개별 암송 확인(채점)
  const handleCheckPractice = (card: VerseCard) => {
    const userText = practiceInputs[card.id] || "";
    const result = gradeVerse(card.text, userText);
    setPracticeResults((prev) => ({
      ...prev,
      [card.id]: result,
    }));
  };

  // 메뉴3: 개별 암송 결과 닫기
  const handleResetPracticeCard = (id: string) => {
    setPracticeResults((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // 메뉴4: 시험 시작
  const startExam = () => {
    if (verses.length === 0) return;
    const shuffled = [...verses];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setExamQuestions(shuffled);
    setExamIndex(0);
    setExamCurrentInput("");
    setExamAnswers([]);
    setExamStarted(true);
    setExamFinished(false);
  };

  // 메뉴4: 현재 문제 제출 및 다음 문제로 이동
  const handleNextExamQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCard = examQuestions[examIndex];
    const result = gradeVerse(currentCard.text, examCurrentInput);
    const updatedAnswers = [
      ...examAnswers,
      {
        card: currentCard,
        userInput: examCurrentInput,
        result,
      },
    ];
    setExamAnswers(updatedAnswers);
    setExamCurrentInput("");

    if (examIndex + 1 < examQuestions.length) {
      setExamIndex(examIndex + 1);
    } else {
      setExamFinished(true);
    }
  };

  /**
   * 채점 결과 표기 방식:
   * - 누락된 부분(missing): 붉은색 굵은 글씨
   * - 잘못 쓴 것(wrong): 괄호 ( ) 에 넣고 취소선 표시
   */
  const renderGradedDiff = (result: GradeResult) => {
    return (
      <div className="leading-relaxed break-keep text-[15px]">
        {result.userDiff.map((part, idx) => {
          if (part.type === "equal") {
            return (
              <span key={idx} className="text-slate-800">
                {part.value}
              </span>
            );
          }
          if (part.type === "missing") {
            return (
              <span
                key={idx}
                className="text-red-600 font-bold"
                title="누락된 부분"
              >
                {part.value}
              </span>
            );
          }
          return (
            <span
              key={idx}
              className="text-slate-500 mx-0.5"
              title="잘못 쓴 부분"
            >
              (
              <span className="line-through decoration-red-500 decoration-2">
                {part.value}
              </span>
              )
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6EFE5]">
      {/* 상단 고정 탭 메뉴 */}
      <header className="sticky top-0 z-30 bg-[#1f4e5f] text-white shadow-md">
        <nav className="grid grid-cols-4 border-b border-[#163a47]">
          <button
            type="button"
            onClick={() => setActiveTab("cover")}
            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all relative ${
              activeTab === "cover"
                ? "text-white bg-[#286073] font-bold"
                : "text-slate-200 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 mb-1" />
            <span>안내</span>
            {activeTab === "cover" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#9aa6d1]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all relative ${
              activeTab === "cards"
                ? "text-white bg-[#286073] font-bold"
                : "text-slate-200 hover:text-white"
            }`}
          >
            <StickyNote className="w-4 h-4 mb-1" />
            <span>말씀카드</span>
            {activeTab === "cards" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#9aa6d1]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("memorize")}
            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all relative ${
              activeTab === "memorize"
                ? "text-white bg-[#286073] font-bold"
                : "text-slate-200 hover:text-white"
            }`}
          >
            <PenTool className="w-4 h-4 mb-1" />
            <span>암송</span>
            {activeTab === "memorize" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#9aa6d1]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("exam");
              if (!examStarted) {
                startExam();
              }
            }}
            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all relative ${
              activeTab === "exam"
                ? "text-white bg-[#286073] font-bold"
                : "text-slate-200 hover:text-white"
            }`}
          >
            <GraduationCap className="w-4 h-4 mb-1" />
            <span>시험</span>
            {activeTab === "exam" && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#9aa6d1]" />
            )}
          </button>
        </nav>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col bg-[#F6EFE5]">
        {/* ================= 메뉴 1. 안내페이지 ================= */}
        {activeTab === "cover" && (
          <div className="flex-1 flex flex-col bg-[#F6EFE5] text-[#1f4e5f] select-none">
            {/* 상단 메뉴바에서 약 1cm(mt-9) 띄운 뒤 이미지 배치 */}
            <div className="w-full bg-[#F6EFE5] mt-9">
              <img
                src="/cover-banner.jpg"
                alt="2026 야베스축복기도회 MORIAH 아름다운 전승"
                className="w-full h-auto block"
              />
            </div>

            {/* 이미지 하단에서도 약 1cm(mt-9) 띄운 뒤, 줄 간격을 좁히고 굵은 서체(font-black)로 배치 */}
            <div className="flex flex-col items-center px-6 mt-9 pb-12 text-center bg-[#F6EFE5]">
              <div className="font-cover-title space-y-0.5 text-[#1f4e5f] leading-tight">
                <p className="text-[28px] sm:text-[32px] font-black tracking-tight">
                  2026년
                </p>
                <h1 className="text-[34px] sm:text-[38px] font-black tracking-tight">
                  야베스 축복기도회
                </h1>
                <p className="text-[30px] sm:text-[34px] font-black tracking-tight">
                  말씀암송
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= 메뉴 2. 말씀카드 페이지 ================= */}
        {activeTab === "cards" && (
          <div className="p-4 space-y-5 pb-12">
            {/* 상단: 말씀카드 추가 더보기 버튼 (기본 숨김 처리 + 비밀번호 1234 잠금) */}
            <section className="bg-white/90 rounded-2xl shadow-sm border border-[#e3dacb] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAddPanelOpen((prev) => !prev)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold text-[#1f4e5f] hover:bg-[#f9f5ee] transition"
              >
                <span className="flex items-center gap-2">
                  {isAdminUnlocked ? (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#6d7993]" />
                  )}
                  <span>
                    {editingId
                      ? "말씀카드 수정하기 (관리자)"
                      : "말씀카드 추가 / 관리 (더보기)"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                  {isAddPanelOpen ? (
                    <>
                      접기 <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      더보기 <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </span>
              </button>

              {isAddPanelOpen && (
                <div className="p-4 pt-2 border-t border-[#ede6da] bg-white">
                  {!isAdminUnlocked ? (
                    /* 관리자 비밀번호 입력 화면 */
                    <form
                      onSubmit={handleUnlockAdmin}
                      className="space-y-3 py-1"
                    >
                      <p className="text-xs text-slate-600">
                        말씀카드 추가 및 수정은 관리자만 가능합니다. 비밀번호를 입력해주세요.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          inputMode="numeric"
                          value={pinInput}
                          onChange={(e) => {
                            setPinInput(e.target.value);
                            setPinError("");
                          }}
                          placeholder="비밀번호 입력"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] bg-[#fcfbf9]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-[#1f4e5f] hover:bg-[#173b48] text-white text-xs font-bold transition"
                        >
                          확인
                        </button>
                      </div>
                      {pinError && (
                        <p className="text-xs text-red-600 font-semibold">
                          {pinError}
                        </p>
                      )}
                    </form>
                  ) : (
                    /* 비밀번호 인증 완료 후 표시되는 말씀카드 추가/수정 입력란 */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5" />
                          {editingId
                            ? "말씀카드 수정 모드"
                            : "새 말씀카드 추가 (1~21일차)"}
                        </span>
                        <div className="flex items-center gap-3">
                          {editingId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setOrderInput(String(verses.length + 1));
                                setReferenceInput("");
                                setTextInput("");
                              }}
                              className="text-xs text-slate-500 underline"
                            >
                              수정 취소
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdminUnlocked(false);
                              setEditingId(null);
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            잠금
                          </button>
                        </div>
                      </div>

                      <form
                        onSubmit={handleAddOrUpdateVerse}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              몇번째
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={orderInput}
                                onChange={(e) => setOrderInput(e.target.value)}
                                placeholder="예: 1"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] bg-[#f9f9f7]"
                              />
                              <span className="absolute right-2.5 top-2 text-xs text-slate-400 pointer-events-none">
                                일차
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              구절주소
                            </label>
                            <input
                              type="text"
                              value={referenceInput}
                              onChange={(e) =>
                                setReferenceInput(e.target.value)
                              }
                              placeholder="예: 창세기 22:12"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] bg-[#f9f9f7]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            말씀
                          </label>
                          <textarea
                            rows={3}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="암송할 말씀 구절을 정확하게 입력하세요..."
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] bg-[#f9f9f7] leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSyncing}
                          className="w-full py-2.5 rounded-xl bg-[#1f4e5f] hover:bg-[#173b48] disabled:opacity-60 active:scale-[0.99] text-white font-semibold text-sm shadow transition flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          {isSyncing
                            ? "전체 사용자에게 공유 저장 중..."
                            : editingId
                              ? "말씀카드 수정 및 전체 공유"
                              : "말씀카드 추가 및 전체 공유"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 실시간 동기화 상태 알림 배너 */}
            {syncMessage && (
              <div className="rounded-xl bg-[#e8f0f3] border border-[#b8d0d9] px-3.5 py-2.5 text-xs font-semibold text-[#1f4e5f] flex items-center justify-between gap-2">
                <span>{syncMessage}</span>
                <button
                  type="button"
                  onClick={() => setSyncMessage("")}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 날짜순(1일차, 2일차, 3일차...) 쪽지 모양 나열 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-600">
                  등록된 말씀 쪽지 ({sortedVerses.length} / 21개)
                </span>
                <button
                  type="button"
                  onClick={() => fetchLatestVersesFromServer(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f4e5f] hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  최신 말씀 새로고침
                </button>
              </div>

              {sortedVerses.length === 0 ? (
                <div className="text-center py-12 bg-white/70 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm">
                  등록된 말씀카드가 없습니다.
                  <br />위 [더보기]를 눌러 첫 번째 말씀을 추가해보세요!
                </div>
              ) : (
                sortedVerses.map((card) => (
                  <article
                    key={card.id}
                    className="note-card relative rounded-xl p-5 border border-[#e5dec9] transition-all"
                  >
                    {/* 쪽지 상단 파스텔 블루/라벤더 마스킹 테이프 장식 */}
                    <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 rotate-[-1deg] rounded-sm pointer-events-none" />

                    <div className="flex items-start justify-between gap-2 mb-3 pt-1 border-b border-dashed border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1f4e5f] text-white">
                          {card.order}일차
                        </span>
                        <h3 className="font-bold text-base text-[#1f4e5f]">
                          {card.reference}
                        </h3>
                      </div>

                      {/* 관리자 잠금 해제 상태일 때만 수정/삭제 버튼을 노출 */}
                      {isAdminUnlocked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditSelect(card)}
                            className="p-1.5 text-slate-500 hover:text-[#1f4e5f] hover:bg-slate-100 rounded-lg transition"
                            title="수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVerse(card.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap break-keep">
                      {card.text}
                    </p>
                  </article>
                ))
              )}
            </section>

            {/* 맨 아래: 관리자용 '전체 공유 및 재배포' 버튼 (수정한 내용을 서버에 즉시 저장하여 다른 모든 사람에게 최신화) */}
            {isAdminUnlocked && (
              <section className="pt-2">
                <div className="rounded-2xl bg-white/95 border border-[#d4c9b4] p-4 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1f4e5f]">
                      모든 성도에게 최신 말씀 공유 (서버 저장 & 재배포)
                    </span>
                    {hasUnsavedServerChanges && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        반영 필요
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    말씀 추가·수정 시 자동으로 전체 공유되며, 아래 버튼을 누르면 현재 목록을 서버와 GitHub에 즉시 저장하고 재배포하여 다른 모든 사람의 핸드폰에도 똑같이 최신화합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleManualRedeploySync}
                    disabled={isSyncing}
                    className="w-full py-3 rounded-xl bg-[#1f4e5f] hover:bg-[#163a47] disabled:opacity-60 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2"
                  >
                    <CloudUpload className="w-4 h-4" />
                    {isSyncing
                      ? "서버 저장 및 재배포 진행 중..."
                      : "전체 공유 및 재배포 (모든 사람에게 최신화)"}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ================= 메뉴 3. 암송페이지 ================= */}
        {activeTab === "memorize" && (
          <div className="p-4 space-y-4 pb-12">
            <div className="bg-[#e8e3d9] rounded-xl p-3.5 border border-[#d6cebf] text-xs text-[#1f4e5f] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1f4e5f]" />
              <div>
                <strong>순서대로 암송 연습:</strong> <strong>힌트</strong>를 누르면 처음부터 한 단어씩 채워집니다. <strong>확인</strong>을 누르면 누락된 부분은{" "}
                <span className="text-red-600 font-bold">붉은색 굵은 글씨</span>로, 잘못 쓴 것은{" "}
                <span className="text-slate-500">
                  (<span className="line-through decoration-red-500">취소선</span>)
                </span>
                으로 표시됩니다.
              </div>
            </div>

            {sortedVerses.length === 0 ? (
              <div className="text-center py-12 bg-white/70 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm">
                저장된 말씀카드가 없습니다.
                <br />
                먼저 [말씀카드] 탭에서 말씀을 등록해주세요.
              </div>
            ) : (
              sortedVerses.map((card) => {
                const grade = practiceResults[card.id];
                const currentInput = practiceInputs[card.id] || "";

                return (
                  <article
                    key={card.id}
                    className="note-card relative rounded-xl p-5 border border-[#e5dec9] space-y-3"
                  >
                    <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 rotate-[1deg] rounded-sm pointer-events-none" />

                    {/* 상단: 몇번째 + 구절주소만 표시 */}
                    <div className="flex items-center justify-between pt-1 border-b border-dashed border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1f4e5f] text-white">
                          {card.order}일차
                        </span>
                        <h3 className="font-bold text-base text-[#1f4e5f]">
                          {card.reference}
                        </h3>
                      </div>

                      {grade && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            grade.isPerfect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {grade.isPerfect ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> 완벽 암송!
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" /> 정확도 {grade.accuracy}%
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* 말씀 입력 빈칸 */}
                    <div>
                      <textarea
                        rows={3}
                        value={currentInput}
                        onChange={(e) =>
                          setPracticeInputs((prev) => ({
                            ...prev,
                            [card.id]: e.target.value,
                          }))
                        }
                        placeholder="이곳에 암송한 말씀을 띄어쓰기까지 정확하게 적어보세요..."
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {/* 힌트 버튼: 누를 때마다 처음부터 한 단어씩 입력 */}
                      <button
                        type="button"
                        onClick={() => handleHintWord(card)}
                        className="px-3.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        힌트 (한 단어씩)
                      </button>

                      <div className="flex items-center gap-2">
                        {grade && (
                          <button
                            type="button"
                            onClick={() => handleResetPracticeCard(card.id)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                          >
                            결과 닫기
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCheckPractice(card)}
                          className="px-4 py-2 rounded-lg bg-[#1f4e5f] hover:bg-[#173b48] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          확인
                        </button>
                      </div>
                    </div>

                    {/* 확인(채점) 결과 영역 */}
                    {grade && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                          <div className="text-xs font-bold text-slate-500 mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span>
                              채점 결과 (
                              <span className="text-red-600 font-bold">누락</span>{" "}
                              /{" "}
                              <span className="text-slate-500">
                                (<span className="line-through decoration-red-500">오타</span>)
                              </span>
                              )
                            </span>
                            {grade.isPerfect && (
                              <span className="text-emerald-600 font-bold">
                                맞춤법·띄어쓰기 100% 일치!
                              </span>
                            )}
                          </div>
                          {renderGradedDiff(grade)}
                        </div>

                        <div className="bg-[#eef3f6] rounded-xl p-3.5 border border-[#cfdde4]">
                          <div className="text-xs font-bold text-[#1f4e5f] mb-1">
                            정답 말씀
                          </div>
                          <p className="text-[15px] leading-relaxed text-[#153541] break-keep">
                            {grade.targetText}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* ================= 메뉴 4. 시험페이지 ================= */}
        {activeTab === "exam" && (
          <div className="p-4 space-y-5 pb-12">
            {verses.length === 0 ? (
              <div className="text-center py-12 bg-white/70 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm">
                저장된 말씀이 없어 시험을 시작할 수 없습니다.
                <br />
                먼저 [말씀카드] 탭에서 말씀을 추가해주세요.
              </div>
            ) : !examFinished && examQuestions.length > 0 ? (
              /* 시험 진행 화면 */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#e8e3d9] px-4 py-3 rounded-xl border border-[#d6cebf]">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-[#1f4e5f]" />
                    <span className="text-xs font-bold text-[#1f4e5f]">
                      랜덤 말씀 시험 진행 중
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1f4e5f] text-white">
                    {examIndex + 1} / {examQuestions.length} 문제
                  </span>
                </div>

                {/* 진행률 바 */}
                <div className="w-full h-2 bg-slate-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1f4e5f] transition-all duration-300"
                    style={{
                      width: `${((examIndex + 1) / examQuestions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* 현재 문제 카드 */}
                <form
                  onSubmit={handleNextExamQuestion}
                  className="note-card relative rounded-2xl p-6 border border-[#e5dec9] space-y-4"
                >
                  <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 rounded-sm pointer-events-none" />

                  <div className="text-center py-3 border-b border-dashed border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      문제 {examIndex + 1} ({examQuestions[examIndex].order}일차 말씀)
                    </span>
                    <h2 className="text-2xl font-extrabold text-[#1f4e5f]">
                      {examQuestions[examIndex].reference}
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">
                      위 구절주소의 말씀을 빈칸에 입력하세요
                    </label>
                    <textarea
                      rows={5}
                      value={examCurrentInput}
                      onChange={(e) => setExamCurrentInput(e.target.value)}
                      placeholder="맞춤법과 띄어쓰기에 유의하여 말씀을 작성해주세요..."
                      autoFocus
                      className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1f4e5f] leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#1f4e5f] hover:bg-[#173b48] text-white font-bold text-sm shadow-md transition"
                  >
                    {examIndex + 1 < examQuestions.length
                      ? "답안 제출 후 다음 문제"
                      : "시험 완료 및 전체 채점하기"}
                  </button>
                </form>
              </div>
            ) : (
              /* 시험 완료 후 채점 결과 화면 (문제를 풀었던 순서대로 나열) */
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-[#e5dec9] shadow-sm text-center space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#e8e3d9] text-[#1f4e5f] text-xs font-bold">
                    시험 채점 완료
                  </span>
                  <h2 className="text-xl font-bold text-[#1f4e5f]">
                    총 {examAnswers.length}문제 중{" "}
                    <span className="text-emerald-700">
                      {examAnswers.filter((a) => a.result.isPerfect).length}문제
                    </span>{" "}
                    완벽 암송!
                  </h2>
                  <p className="text-xs text-slate-500">
                    문제를 풀었던 순서대로 누락된 부분은{" "}
                    <span className="text-red-600 font-bold">붉은색 굵은 글씨</span>로, 잘못 쓴 것은{" "}
                    <span className="text-slate-500">
                      (<span className="line-through decoration-red-500">취소선</span>)
                    </span>
                    으로 표시됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={startExam}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1f4e5f] text-white text-xs font-bold shadow hover:bg-[#173b48] transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다시 랜덤 시험 보기
                  </button>
                </div>

                {/* 문제를 풀었던 순서대로 채점 카드 나열 */}
                <div className="space-y-4">
                  {examAnswers.map((item, idx) => (
                    <article
                      key={`${item.card.id}-${idx}`}
                      className="note-card rounded-xl p-5 border border-[#e5dec9] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#1f4e5f] text-white text-xs font-bold">
                            문제 {idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            ({item.card.order}일차)
                          </span>
                          <h3 className="font-bold text-base text-[#1f4e5f]">
                            {item.card.reference}
                          </h3>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            item.result.isPerfect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.result.isPerfect
                            ? "정답 (100%)"
                            : `오답 (${item.result.accuracy}%)`}
                        </span>
                      </div>

                      {/* 내가 쓴 답안 */}
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 mb-1.5">
                          채점 결과 (
                          <span className="text-red-600 font-bold">누락</span> /{" "}
                          <span className="text-slate-500">
                            (<span className="line-through decoration-red-500">오타</span>)
                          </span>
                          )
                        </div>
                        {renderGradedDiff(item.result)}
                      </div>

                      {/* 아래에 정답 함께 표시 */}
                      <div className="bg-[#eef3f6] rounded-xl p-3.5 border border-[#cfdde4]">
                        <div className="text-xs font-bold text-[#1f4e5f] mb-1">
                          정답 말씀
                        </div>
                        <p className="text-[15px] leading-relaxed text-[#153541] break-keep">
                          {item.result.targetText}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
