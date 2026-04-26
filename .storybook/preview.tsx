import type { Preview } from '@storybook/react-vite'
import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { TooltipProvider } from '../src/components/ui/tooltip'
import '../src/styles.css'

const stubRouter = createRouter({
  routeTree: createRootRoute(),
  history: createMemoryHistory({ initialEntries: ['/'] }),
})
// Pre-load so the router is in "idle" state, not "pending"
stubRouter.load()

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme (light / dark)',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as 'light' | 'dark') ?? 'light'
      // biome-ignore lint/correctness/useHookAtTopLevel: decorators run as components
      useEffect(() => {
        applyTheme(theme)
      }, [theme])
      return (
        <RouterContextProvider router={stubRouter}>
          <TooltipProvider>
            <div
              className={theme}
              style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', padding: '1rem' }}
            >
              <Story />
            </div>
          </TooltipProvider>
        </RouterContextProvider>
      )
    },
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
  },
};

export default preview;
