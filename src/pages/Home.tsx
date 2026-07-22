import { DevCredit } from '../components/DevCredit'
import { InviteDetails } from '../components/InviteDetails'
import { PageShell } from '../components/PageShell'

export default function Home() {
  return (
    <PageShell footer={<DevCredit strong />}>
      <InviteDetails isHome />
    </PageShell>
  )
}
