import type { Preview } from '@storybook/react-vite'
import '../src/styles.css'

const preview: Preview = {
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
