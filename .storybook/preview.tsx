import type { Preview } from '@storybook/react-vite'
import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from '@tanstack/react-router'
import { TooltipProvider } from '../src/components/ui/tooltip'
import '../src/styles.css'

const stubRouter = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ['/'] }),
})
// Pre-load so the router is in "idle" state, not "pending"
stubRouter.load()

const preview: Preview = {
  decorators: [
    (Story) => (
      <RouterContextProvider router={stubRouter}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </RouterContextProvider>
    ),
  ],
  parameters: {
    options: {
      storySort: {
        order: [
          'Design System',
          [
            'Foundations',
            'Typography',
            'Layout',
            'Actions',
            'Forms',
            'Navigation',
            'Data Display',
            'Feedback',
            'Overlays',
          ],
        ],
      },
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
    },
  },
};

export default preview;
