import { SelectedTeamSwitcher } from "@stackframe/stack";
import { redirect } from "next/navigation";
import { stackServerApp } from "src/stack";

export default async function PaymentsPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const team = user.selectedTeam;
  const teamId = team?.id;
  const creditItem = await team.getItem("credit");

  if (!team) {
    return <div>
      No team selected.
      <SelectedTeamSwitcher />
    </div>;
  }

  async function toPurchaseUrl() {
    "use server";
    const team = await stackServerApp.getTeam(teamId);
    const url = await team.createPurchaseUrl("sub", {});
    redirect(url.toString());
  }

  return (
    <div>
      <h1>Payments</h1>
      <SelectedTeamSwitcher />
      <div>
        Team credits: {creditItem.quantity}
      </div>
      <button className="bg-blue-500 text-white p-2 rounded border border-blue-600" onClick={toPurchaseUrl as any}>
        Purchase credits
      </button>
    </div>
  );
}

