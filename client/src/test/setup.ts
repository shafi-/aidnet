import '@testing-library/jest-dom'

// Initialize the global i18n instance so useTranslation() in components
// resolves real strings (English default) instead of raw keys in unit tests.
import '@/i18n/config'
