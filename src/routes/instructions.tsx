import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/instructions")({
  component: InstructionsPage,
});

function InstructionsPage() {
  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-y-auto" dir="rtl">
      {/* Background decorations */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-3xl relative z-10 pb-20">
        <div className="flex items-center gap-4 mb-8 sticky top-0 bg-background/80 backdrop-blur-md py-4 border-b border-white/5 z-20">
          <Link to="/" className="btn-ghost !p-3 transform rotate-180">
            <span className="text-xl">←</span>
          </Link>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-600">
            📖 تعليمات اللعبة
          </h1>
        </div>

        <div className="space-y-12">
          {/* Section 1: Introduction */}
          <section className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🎲</span> كيف تلعب Ludo؟
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              لودو هي لعبة لوحية كلاسيكية. يمتلك كل لاعب 4 قطع (Tokens) في قاعدته الخاصة. 
              الهدف هو إيصال جميع القطع الأربع إلى "المركز" (المربع الأخير) قبل بقية اللاعبين.
            </p>
            <ul className="mt-4 space-y-3 text-muted-foreground list-disc list-inside">
              <li>لإخراج قطعة من القاعدة، يجب أن يظهر لك الرقم <strong>6</strong> في النرد.</li>
              <li>عندما يظهر لك الرقم <strong>6</strong>، تحصل على لفة إضافية مجانية.</li>
              <li>إذا ظهر لك الرقم <strong>6</strong> ثلاث مرات متتالية، يضيع دورك ويتم نقله للاعب التالي.</li>
            </ul>
          </section>

          {/* Section 2: Safe Zones & Captures */}
          <section className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <span>⚔️</span> القتال والمناطق الآمنة
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              تزيد متعة اللعبة عندما تتنافس مع خصومك على نفس المربعات!
            </p>
            <div className="mt-4 space-y-4">
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-white font-bold mb-2">أكل القطع (Capture)</h3>
                <p className="text-sm text-white/70">إذا توقفت قطعتك في نفس المربع الذي توجد فيه قطعة لخصمك (وهو ليس مربعاً آمناً)، فسيتم <strong>أكل</strong> قطعة الخصم وإعادتها إلى قاعدته، وتحصل أنت على <strong>لفة نرد إضافية!</strong></p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-white font-bold mb-2">المناطق الآمنة (Safe Zones)</h3>
                <p className="text-sm text-white/70">توجد مربعات مميزة بنجمة 🌟 على اللوحة. هذه المربعات آمنة تماماً. لا يمكن لأي لاعب أكل قطعة لاعب آخر إذا كانت تتواجد في مربع آمن.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Game Modes */}
          <section className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <span>🌐</span> أطوار اللعب
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 p-5 rounded-xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-2">اللعب المحلي (Offline)</h3>
                <p className="text-sm text-muted-foreground">العب مع أصدقائك على نفس الجهاز أو ضد الذكاء الاصطناعي (البوتات). يمكنك تحديد عدد اللاعبين بسهولة واللعب بدون إنترنت.</p>
              </div>
              <div className="bg-black/30 p-5 rounded-xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-2">اللعب المباشر (Online)</h3>
                <p className="text-sm text-muted-foreground">تنافس مع لاعبين من حول العالم! يمكنك إنشاء غرفة خاصة ودعوة أصدقائك عبر "كود الغرفة"، أو الانضمام لمباريات سريعة.</p>
              </div>
            </div>
          </section>

          {/* Section 4: Coins & Punishments */}
          <section className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <span>💰</span> العملات والانسحاب
            </h2>
            <ul className="space-y-4 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-xl">🤑</span>
                <div>
                  <strong className="text-white block mb-1">العملات (Coins):</strong>
                  عند الدخول لمباراة أونلاين، يتم خصم 50 عملة كرسوم دخول. يتم توزيع الجوائز في النهاية على المراكز الأولى، حيث يحصل الفائز بالمركز الأول على نصيب الأسد!
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <strong className="text-red-400 block mb-1">عقوبة الانسحاب:</strong>
                  إذا قمت بالانسحاب الطوعي من مباراة أونلاين عبر زر (الانسحاب)، سيتم حظرك مؤقتاً لمدة 15 دقيقة من اللعب الأونلاين! اللعب النظيف هو الأساس. 
                  (ملاحظة: إذا قام المُضيف بطردك من الغرفة، فلن تُعاقب).
                </div>
              </li>
            </ul>
          </section>
          
          {/* Section 5: Achievements */}
          <section className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              اجمع الإنجازات وتباهى بها!
            </h2>
            <p className="text-muted-foreground mb-6">
              تمتلك اللعبة نظام إنجازات متطور. العب، فز، كدّس ثروتك، والتهم قطع خصومك لفتح إنجازات أسطورية مثل "ملك اللودو" و "القاتل المحترف"!
            </p>
            <Link to="/achievements" className="btn-game inline-block bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
              استكشف الإنجازات الآن
            </Link>
          </section>

        </div>
      </div>
    </div>
  );
}
