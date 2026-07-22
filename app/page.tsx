import { getCachedRaffleData } from "@/lib/raffleData";
import { RaffleHeader } from "@/components/raffle/RaffleHeader";
import { ProgressSection } from "@/components/raffle/ProgressSection";
import { PrizeSection } from "@/components/raffle/PrizeSection";
import { TopBuyersSection } from "@/components/raffle/TopBuyersSection";
import { FaqContactSection } from "@/components/raffle/FaqContactSection";
import { InfoModal } from "@/components/ui/InfoModal";

// Not statically generated: a page relying on Firestore at build time means
// any transient Firestore issue (like the read-quota outage that prompted
// this) blocks every future deploy, not just page requests.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { config, progress, topBuyers } = await getCachedRaffleData();

  if (!config) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-center text-ink-soft">
        A rifa ainda não foi configurada. Rode o script de seed para começar.
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-4 px-6 py-6 sm:gap-6 sm:py-8">
      <RaffleHeader
        title={config.title}
        description={config.description}
        photoURL={config.photoURL}
        ticketPriceCents={config.ticketPriceCents}
        totalTickets={config.totalTickets}
        availableCount={progress.availableCount}
      />

      <ProgressSection progress={progress} />

      <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
        <InfoModal label="Prêmio" title={config.prizeTitle}>
          <PrizeSection
            prizeTitle={config.prizeTitle}
            prizeDescription={config.prizeDescription}
            prizePhotoURL={config.prizePhotoURL}
          />
        </InfoModal>
        <InfoModal label="Maiores compradores" title="Maiores compradores">
          <TopBuyersSection entries={topBuyers} />
        </InfoModal>
        <InfoModal label="Regulamento" title="Regulamento">
          <p className="whitespace-pre-line">{config.regulamento}</p>
        </InfoModal>
        <InfoModal label="Informações sobre a premiação" title="Informações sobre a premiação">
          <p className="whitespace-pre-line">{config.premiacaoInfo}</p>
        </InfoModal>
        <InfoModal label="Dúvidas" title="Dúvidas">
          <FaqContactSection whatsappNumber={config.whatsappNumber} intro={config.faqIntro} />
        </InfoModal>
      </nav>
    </main>
  );
}
