import app from 'flarum/forum/app';
import TextEditor from 'flarum/common/components/TextEditor';
import extendAuthModals from './extendAuthModals';
import extendComposer from './extendComposer';

export { default as extend } from './extend';

/**
 * Flarum 2.0.0-beta.5 race: TextEditor.onbuild fires 50 ms after
 * `_load().then(() => { loading = false; m.redraw(); })`. Mithril 2 redraws
 * via rAF, so on slow CPUs / throttled tabs the DOM still shows the
 * LoadingIndicator when the timeout fires, and `this.$('.TextEditor-editorContainer')[0]`
 * returns undefined → BasicEditorDriver crashes on `dom.append(this.el)`.
 * Patch onbuild to spin until the container exists (max ~1 s) so the
 * editor finishes mounting deterministically.
 */
function patchTextEditorOnbuild(): void {
  const proto = (TextEditor as any).prototype;
  if (!proto || proto.__captchalaPatched) return;
  proto.__captchalaPatched = true;

  // Flarum 2.0.0-beta.5 race: TextEditor.oninit sets `this.loading = true`
  // and view() renders <LoadingIndicator/> until _load()'s async loaders
  // (e.g. flarum-emoji's dynamic emojiMap import) settle. _load.then sets
  // loading=false + m.redraw(); 50 ms later setTimeout fires onbuild, which
  // looks up `.TextEditor-editorContainer` via this.$. mithril 2 redraws
  // are async (rAF) and `m.redraw.sync` was removed, so on slow CPU /
  // throttled tabs the DOM still shows the LoadingIndicator at onbuild
  // time → BasicEditorDriver crashes on `dom.append`.
  //
  // Sidestep the entire race by force-rendering with loading=false from
  // the first frame: editorContainer is present immediately, _loaders
  // still run async (emoji autocomplete just needs emojiMap when the
  // user types — not before).
  const originalOninit = proto.oninit;
  proto.oninit = function (this: any, vnode: any) {
    originalOninit.call(this, vnode);
    this.loading = false;
  };
}

app.initializers.add('captchala/flarum', () => {
  patchTextEditorOnbuild();
  extendAuthModals();
  extendComposer('flarum/forum/components/DiscussionComposer', 'forum_post');
  extendComposer('flarum/forum/components/ReplyComposer', 'forum_post');
});
