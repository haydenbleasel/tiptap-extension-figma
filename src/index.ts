import { InputRule, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figma: {
      setFigma: (options: { src: string }) => ReturnType;
      unsetFigma: () => ReturnType;
    };
  }
}

const figmaRegex =
  /https:\/\/[\w\.-]+\.?figma.com\/([\w-]+)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;

const createEmbedSrc = (url: string) => {
  const embedUrl = new URL('https://www.figma.com/embed');

  embedUrl.searchParams.set('embed_host', 'tiptap');
  embedUrl.searchParams.set('embed_origin', window.location.origin);
  embedUrl.searchParams.set('url', url);

  return embedUrl.toString();
};

export const Figma = Node.create({
  name: 'figma',
  group: 'block',
  atom: true,

  addCommands() {
    return {
      setFigma:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },

      unsetFigma:
        () =>
        ({ commands }) => {
          return commands.deleteRange({
            from: 0,
            to: -1,
          });
        },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  // biome-ignore lint/style/useNamingConvention: "This is a TipTap extension property"
  parseHTML() {
    return [
      {
        tag: 'iframe[src*="figma.com"]',
      },
    ];
  },

  // biome-ignore lint/style/useNamingConvention: "This is a TipTap extension property"
  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        width: '800',
        height: '450',
        allowfullscreen: 'true',
      }),
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: figmaRegex,
        handler: ({ match, commands }) => {
          const url = match[0];
          const embedSrc = createEmbedSrc(url);

          commands.setFigma({ src: embedSrc });
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('figmaEmbedPlugin'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain');
            if (text && figmaRegex.test(text)) {
              const embedSrc = createEmbedSrc(text);
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  this.type.create({ src: embedSrc })
                )
              );
              return true;
            }
            return false;
          },

          // biome-ignore lint/style/useNamingConvention: "This is a TipTap extension property"
          handleDOMEvents: {
            drop: (view, event) => {
              const text = event.dataTransfer?.getData('text/plain');
              if (text && figmaRegex.test(text)) {
                const embedSrc = createEmbedSrc(text);
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });
                if (coordinates) {
                  view.dispatch(
                    view.state.tr.insert(
                      coordinates.pos,
                      this.type.create({ src: embedSrc })
                    )
                  );
                  return true;
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
