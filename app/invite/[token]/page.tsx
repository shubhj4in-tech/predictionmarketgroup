// Phase 5: Invite link handler
export default function InvitePage({ params }: { params: { token: string } }) {
  return <div className="p-6">Invite {params.token} — Phase 5</div>;
}
