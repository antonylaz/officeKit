import { notFound } from "next/navigation";
import { verifyOnboardingToken, prepareOnboarding } from "@/server/onboarding";
import { OnboardingWizard } from "@/components/supplier/OnboardingWizard";

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await verifyOnboardingToken(token);
  if (!user) notFound();
  const prep = await prepareOnboarding(user.email);
  return (
    <OnboardingWizard
      token={token}
      email={user.email}
      supplierName={user.supplier?.name ?? ""}
      totpSecret={prep.secret}
      qrDataUrl={prep.qrDataUrl}
    />
  );
}
