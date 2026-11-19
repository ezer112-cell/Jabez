"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  VerseCard,
  INITIAL_VERSES,
  gradeVerse,
  GradeResult,
} from "@/utils/grading";

type TabType = "cover" | "cards" | "memorize" | "exam";

const STORAGE_KEY = "jabez_2026_verses_v1";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("cover");
  const [verses, setVerses] = useState<VerseCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 메뉴2: 말씀카드 입력/수정 상태
  const [orderInput, setOrderInput] = useState<string>("");
  const [referenceInput, setReferenceInput] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 메뉴3: 암송페이지 상태 (각 카드별 사용자 입력 및 채점 결과)
  const [practiceInputs, setPracticeInputs] = useState<Record<string, string>>(
    {}
  );
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

  // 로컬 스토리지 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVerses(parsed);
          setOrderInput(String(parsed.length + 1));
        }
      } else {
        setVerses(INITIAL_VERSES);
        setOrderInput(String(INITIAL_VERSES.length + 1));
      }
    } catch {
      setVerses(INITIAL_VERSES);
      setOrderInput("4");
    }
    setIsLoaded(true);
  }, []);

  // 로컬 스토리지 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
    }
  }, [verses, isLoaded]);

  // 날짜/순서(order) 오름차순 정렬된 말씀 목록
  const sortedVerses = [...verses].sort((a, b) => a.order - b.order);

  // 메뉴2: 말씀카드 추가 또는 수정 저장
  const handleAddOrUpdateVerse = (e: React.FormEvent) => {
    e.preventDefault();
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

    if (editingId) {
      setVerses((prev) =>
        prev.map((v) =>
          v.id === editingId
            ? {
                ...v,
                order: orderNum,
                reference: referenceInput.trim(),
                text: textInput.trim(),
              }
            : v
        )
      );
      setEditingId(null);
    } else {
      const newCard: VerseCard = {
        id: `verse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        order: orderNum,
        reference: referenceInput.trim(),
        text: textInput.trim(),
      };
      setVerses((prev) => [...prev, newCard]);
    }

    const nextOrder =
      editingId !== null
        ? Math.max(...verses.map((v) => v.order), orderNum) + 1
        : orderNum + 1;
    setOrderInput(String(nextOrder));
    setReferenceInput("");
    setTextInput("");
  };

  // 메뉴2: 쪽지 삭제
  const handleDeleteVerse = (id: string) => {
    setVerses((prev) => prev.filter((v) => v.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setReferenceInput("");
      setTextInput("");
    }
  };

  // 메뉴2: 쪽지 수정 모드로 불러오기
  const handleEditSelect = (card: VerseCard) => {
    setEditingId(card.id);
    setOrderInput(String(card.order));
    setReferenceInput(card.reference);
    setTextInput(card.text);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // 메뉴3: 개별 암송 다시 쓰기
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

  // 채점 결과에서 틀린 부분을 붉은 글씨로 렌더링하는 헬퍼
  const renderGradedDiff = (result: GradeResult) => {
    if (result.userText.trim().length === 0) {
      return (
        <span className="text-red-600 font-semibold">
          (입력한 말씀이 없습니다)
        </span>
      );
    }

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
          if (part.type === "wrong") {
            return (
              <span
                key={idx}
                className="text-red-600 font-bold bg-red-100/80 underline decoration-red-500 decoration-2 px-0.5 rounded"
                title="틀린 글자 또는 띄어쓰기"
              >
                {part.value}
              </span>
            );
          }
          return (
            <span
              key={idx}
              className="text-red-600 font-bold bg-red-50 border border-dashed border-red-400 px-1 mx-0.5 rounded text-xs align-middle"
              title="빠진 글자/띄어쓰기"
            >
              [{part.value} 누락]
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 고정 탭 메뉴 (포스터의 모던 네이비 & 라벤더 포인트 적용) */}
      <header className="sticky top-0 z-30 bg-[#233b53] text-white shadow-md">
        <nav className="grid grid-cols-4 border-b border-[#1b2e42]">
          <button
            type="button"
            onClick={() => setActiveTab("cover")}
            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all relative ${
              activeTab === "cover"
                ? "text-white bg-[#2c4966] font-bold"
                : "text-slate-300 hover:text-white"
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
                ? "text-white bg-[#2c4966] font-bold"
                : "text-slate-300 hover:text-white"
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
                ? "text-white bg-[#2c4966] font-bold"
                : "text-slate-300 hover:text-white"
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
                ? "text-white bg-[#2c4966] font-bold"
                : "text-slate-300 hover:text-white"
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
      <main className="flex-1 flex flex-col">
        {/* ================= 메뉴 1. 안내페이지 ================= */}
        {activeTab === "cover" && (
          <div className="flex-1 flex flex-col items-center justify-center paper-texture text-[#233b53] px-6 py-16 select-none relative overflow-hidden">
            {/* 배경의 은은한 모던 그래픽 포인트 (깨지지 않는 깔끔한 배경 장식) */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#9aa6d1]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#233b53]/10 blur-3xl pointer-events-none" />

            <div className="z-10 flex flex-col items-center text-center space-y-6">
              <h1 className="text-4xl sm:text-[42px] font-black tracking-tight text-[#233b53] leading-tight break-keep">
                2026년 야베스 축복기도회
              </h1>

              <div className="w-12 h-1 rounded-full bg-[#9aa6d1]" />

              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#233b53]/85">
                2026.11.09(월)~11.29(주일)
              </p>
            </div>
          </div>
        )}

        {/* ================= 메뉴 2. 말씀카드 페이지 ================= */}
        {activeTab === "cards" && (
          <div className="p-4 space-y-6 pb-12">
            {/* 제일 윗줄: 새로운 말씀카드 입력란 */}
            <section className="bg-white rounded-2xl p-4 shadow-md border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#233b53] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#5b6ea6]" />
                  {editingId ? "말씀카드 수정하기" : "새 말씀카드 추가 (1~21일차)"}
                </h2>
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
              </div>

              <form onSubmit={handleAddOrUpdateVerse} className="space-y-3">
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#233b53] bg-[#f9f9f7]"
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
                      onChange={(e) => setReferenceInput(e.target.value)}
                      placeholder="예: 창세기 22:17"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#233b53] bg-[#f9f9f7]"
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
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#233b53] bg-[#f9f9f7] leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#233b53] hover:bg-[#1a2d40] active:scale-[0.99] text-white font-semibold text-sm shadow transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {editingId ? "말씀카드 수정 완료" : "말씀카드 추가하기"}
                </button>
              </form>
            </section>

            {/* 날짜순(1일차, 2일차, 3일차...) 쪽지 모양 나열 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-600">
                  등록된 말씀 쪽지 ({sortedVerses.length} / 21개)
                </span>
              </div>

              {sortedVerses.length === 0 ? (
                <div className="text-center py-12 bg-white/70 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm">
                  등록된 말씀카드가 없습니다.
                  <br />위 입력란에서 첫 번째 말씀을 추가해보세요!
                </div>
              ) : (
                sortedVerses.map((card) => (
                  <article
                    key={card.id}
                    className="note-card relative rounded-xl p-5 border border-slate-200/90 transition-all"
                  >
                    {/* 쪽지 상단 파스텔 블루/라벤더 마스킹 테이프 장식 */}
                    <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 rotate-[-1deg] rounded-sm pointer-events-none" />

                    <div className="flex items-start justify-between gap-2 mb-3 pt-1 border-b border-dashed border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#233b53] text-white">
                          {card.order}일차
                        </span>
                        <h3 className="font-bold text-base text-[#233b53]">
                          {card.reference}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSelect(card)}
                          className="p-1.5 text-slate-500 hover:text-[#233b53] hover:bg-slate-100 rounded-lg transition"
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
                    </div>

                    <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap break-keep">
                      {card.text}
                    </p>
                  </article>
                ))
              )}
            </section>
          </div>
        )}

        {/* ================= 메뉴 3. 암송페이지 ================= */}
        {activeTab === "memorize" && (
          <div className="p-4 space-y-4 pb-12">
            <div className="bg-[#dfe3ee] rounded-xl p-3.5 border border-[#c8d0e4] text-xs text-[#233b53] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#233b53]" />
              <div>
                <strong>순서대로 암송 연습:</strong> 몇번째와 구절주소를 보고 빈칸에 말씀을 입력한 뒤 <strong>확인</strong>을 누르세요. 맞춤법과 띄어쓰기까지 채점되어 틀린 부분은{" "}
                <span className="text-red-600 font-bold">붉은 글씨</span>로 표시됩니다.
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
                    className="note-card relative rounded-xl p-5 border border-slate-200/90 space-y-3"
                  >
                    <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 rotate-[1deg] rounded-sm pointer-events-none" />

                    {/* 상단: 몇번째 + 구절주소만 표시 */}
                    <div className="flex items-center justify-between pt-1 border-b border-dashed border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#233b53] text-white">
                          {card.order}일차
                        </span>
                        <h3 className="font-bold text-base text-[#233b53]">
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
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#233b53] leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
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
                        className="px-4 py-2 rounded-lg bg-[#233b53] hover:bg-[#1a2d40] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        확인
                      </button>
                    </div>

                    {/* 확인(채점) 결과 영역: 틀린 부분 붉은 글씨 체크 + 아래에 정답 함께 표시 */}
                    {grade && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                          <div className="text-xs font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                            <span>내 답안 채점 결과 (틀린 부분 붉은색 표시)</span>
                            {grade.isPerfect && (
                              <span className="text-emerald-600 font-bold">
                                맞춤법·띄어쓰기 100% 일치!
                              </span>
                            )}
                          </div>
                          {renderGradedDiff(grade)}
                        </div>

                        <div className="bg-[#eef1f8] rounded-xl p-3.5 border border-[#d5dced]">
                          <div className="text-xs font-bold text-[#233b53] mb-1">
                            정답 말씀
                          </div>
                          <p className="text-[15px] leading-relaxed text-[#1a2d40] break-keep">
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
                <div className="flex items-center justify-between bg-[#dfe3ee] px-4 py-3 rounded-xl border border-[#c8d0e4]">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-[#233b53]" />
                    <span className="text-xs font-bold text-[#233b53]">
                      랜덤 말씀 시험 진행 중
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#233b53] text-white">
                    {examIndex + 1} / {examQuestions.length} 문제
                  </span>
                </div>

                {/* 진행률 바 */}
                <div className="w-full h-2 bg-slate-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#233b53] transition-all duration-300"
                    style={{
                      width: `${((examIndex + 1) / examQuestions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* 현재 문제 카드 */}
                <form
                  onSubmit={handleNextExamQuestion}
                  className="note-card relative rounded-2xl p-6 border border-slate-200 space-y-4"
                >
                  <div className="note-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 rounded-sm pointer-events-none" />

                  <div className="text-center py-3 border-b border-dashed border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      문제 {examIndex + 1} ({examQuestions[examIndex].order}일차 말씀)
                    </span>
                    <h2 className="text-2xl font-extrabold text-[#233b53]">
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
                      className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-[15px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#233b53] leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#233b53] hover:bg-[#1a2d40] text-white font-bold text-sm shadow-md transition"
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
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#dfe3ee] text-[#233b53] text-xs font-bold">
                    시험 채점 완료
                  </span>
                  <h2 className="text-xl font-bold text-[#233b53]">
                    총 {examAnswers.length}문제 중{" "}
                    <span className="text-emerald-700">
                      {examAnswers.filter((a) => a.result.isPerfect).length}문제
                    </span>{" "}
                    완벽 암송!
                  </h2>
                  <p className="text-xs text-slate-500">
                    문제를 풀었던 순서대로 틀린 부분은{" "}
                    <span className="text-red-600 font-bold">붉은색</span>으로 표시되며, 아래에 정답을 함께 보여줍니다.
                  </p>
                  <button
                    type="button"
                    onClick={startExam}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#233b53] text-white text-xs font-bold shadow hover:bg-[#1a2d40] transition"
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
                      className="note-card rounded-xl p-5 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#233b53] text-white text-xs font-bold">
                            문제 {idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            ({item.card.order}일차)
                          </span>
                          <h3 className="font-bold text-base text-[#233b53]">
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

                      {/* 내가 쓴 답안 (틀린 부분 붉은색 표시) */}
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 mb-1.5">
                          내가 작성한 말씀 (틀린 부분 붉은색 표시)
                        </div>
                        {renderGradedDiff(item.result)}
                      </div>

                      {/* 아래에 정답 함께 표시 */}
                      <div className="bg-[#eef1f8] rounded-xl p-3.5 border border-[#d5dced]">
                        <div className="text-xs font-bold text-[#233b53] mb-1">
                          정답 말씀
                        </div>
                        <p className="text-[15px] leading-relaxed text-[#1a2d40] break-keep">
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
