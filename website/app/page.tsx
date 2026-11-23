import { AliasExplorer } from "@/components/AliasExplorer";
import { BuildLog, Footer, Quickstart, Stats } from "@/components/Closing";
import { CostCalculator } from "@/components/CostCalculator";
import { DashboardTour } from "@/components/DashboardTour";
import { DropIn } from "@/components/DropIn";
import { FailoverSim } from "@/components/FailoverSim";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Pipeline } from "@/components/Pipeline";
import { TraceSection } from "@/components/TraceSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TraceSection />
        <DropIn />
        <AliasExplorer />
        <Pipeline />
        <FailoverSim />
        <DashboardTour />
        <CostCalculator />
        <Stats />
        <BuildLog />
        <Quickstart />
      </main>
      <Footer />
    </>
  );
}
