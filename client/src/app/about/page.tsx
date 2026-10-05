export const metadata = { title: 'About Donate' }

export default function AboutPage() {
  return (
    <div className="prose max-w-none">
      <h1>About Donate</h1>
      <p>
        A donation platform that connects donors with organizations running
        campaigns for causes that matter.
      </p>
      <h2>How It Works</h2>
      <ul>
        <li>
          Organizations request to join and are reviewed by administrators
        </li>
        <li>Approved organizations can create and manage donation campaigns</li>
        <li>Donors browse live campaigns and contribute directly</li>
        <li>
          Role-based access ensures the right people manage the right things
        </li>
      </ul>
    </div>
  )
}
