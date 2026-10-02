import { useEffect } from 'react';

/** sets the browser tab title while a page is showing, then puts it back */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const original = document.title;
    document.title = title;
    return () => {
      document.title = original;
    };
  }, [title]);
}
