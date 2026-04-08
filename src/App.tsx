import { useAppStore } from './store/useAppStore'
import EventListPage from './pages/EventListPage'
import NewEventPage from './pages/NewEventPage'
import EventDetailPage from './pages/EventDetailPage'
import AddPaymentPage from './pages/AddPaymentPage'
import SettlementPage from './pages/SettlementPage'

export default function App() {
  const { state } = useAppStore()
  const { currentPage } = state

  switch (currentPage.name) {
    case 'list':
      return <EventListPage />
    case 'new-event':
      return <NewEventPage />
    case 'event-detail':
      return <EventDetailPage eventId={currentPage.eventId} />
    case 'add-payment':
      return <AddPaymentPage eventId={currentPage.eventId} />
    case 'settlement':
      return <SettlementPage eventId={currentPage.eventId} />
    default:
      return <EventListPage />
  }
}
