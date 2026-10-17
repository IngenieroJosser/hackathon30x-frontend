import { NotFoundExperience } from '@/components/errors/not-found-experience';

/**
 * Global unmatched-route boundary. This is intentionally a Server Component:
 * no clocks, browser globals, random IDs, or stateful authorization logic.
 * Next.js supplies the 404 status for unmatched routes.
 */
export default function NotFound() {
  return <NotFoundExperience />;
}
