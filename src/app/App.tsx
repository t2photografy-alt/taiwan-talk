import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppShell } from '../components/AppShell';
import { presetPhrases } from '../data/presets';
import { ComposePage } from '../features/compose/ComposePage';
import { DisplayPage } from '../features/display/DisplayPage';
import { HomePage } from '../features/home/HomePage';
import { MessagesPage } from '../features/messages/MessagesPage';
import { PracticePage } from '../features/practice/PracticePage';
import { SavedPage } from '../features/saved/SavedPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { conversationService } from '../lib/conversation/conversationService';
import type { ConversationResult, Phrase } from '../lib/conversation/types';
import { localPhraseRepository } from '../lib/storage/localPhraseRepository';
import { nowIso } from '../lib/utils/date';
import { createId } from '../lib/utils/id';

type RouteState = {
  path: string;
  displayId?: string;
  practicePhraseId?: string;
};

function readRoute(): RouteState {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  if (pathname.startsWith('/display/')) {
    return {
      path: '/display',
      displayId: decodeURIComponent(pathname.replace('/display/', '')),
    };
  }

  if (pathname === '/compose') {
    return { path: '/compose' };
  }

  if (pathname === '/messages') {
    return { path: '/messages' };
  }

  if (pathname === '/practice') {
    return { path: '/practice', practicePhraseId: searchParams.get('phrase') ?? undefined };
  }

  if (pathname === '/saved') {
    return { path: '/saved' };
  }

  if (pathname === '/settings') {
    return { path: '/settings' };
  }

  return { path: '/' };
}

function toPersistablePhrase(phrase: Phrase): Phrase {
  if (!phrase.id.startsWith('draft')) {
    return phrase;
  }

  const timestamp = nowIso();

  return {
    ...phrase,
    id: createId('phrase'),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => readRoute());
  const [savedPhrases, setSavedPhrases] = useState<Phrase[]>([]);
  const [draftDisplayPhrase, setDraftDisplayPhrase] = useState<Phrase | null>(null);

  const reloadSavedPhrases = useCallback(async () => {
    const nextPhrases = await localPhraseRepository.list();
    setSavedPhrases(nextPhrases);
  }, []);

  useEffect(() => {
    void reloadSavedPhrases();

    const handlePopState = () => setRoute(readRoute());
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [reloadSavedPhrases]);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const findPhrase = useCallback(
    (id?: string) => {
      if (!id) {
        return undefined;
      }

      return (
        savedPhrases.find((phrase) => phrase.id === id) ??
        (draftDisplayPhrase?.id === id ? draftDisplayPhrase : undefined) ??
        presetPhrases.find((phrase) => phrase.id === id)
      );
    },
    [draftDisplayPhrase, savedPhrases],
  );

  const savePhrase = useCallback(
    async (phrase: Phrase) => {
      const savedPhrase = await localPhraseRepository.save(toPersistablePhrase(phrase));
      await reloadSavedPhrases();
      return savedPhrase;
    },
    [reloadSavedPhrases],
  );

  const saveDisplayPhrase = useCallback(
    async (phrase: Phrase) => {
      const savedPhrase = await savePhrase(phrase);
      setDraftDisplayPhrase(savedPhrase);
      navigate(`/display/${encodeURIComponent(savedPhrase.id)}`);
    },
    [navigate, savePhrase],
  );

  const saveConversationResult = useCallback(
    async (result: ConversationResult) => {
      const phrase = conversationService.toPhrase(result);
      await savePhrase(phrase);
    },
    [savePhrase],
  );

  const displayConversationResult = useCallback(
    (result: ConversationResult) => {
      const phrase = conversationService.toPhrase(result, { id: createId('draft') });
      setDraftDisplayPhrase(phrase);
      navigate(`/display/${encodeURIComponent(phrase.id)}`);
    },
    [navigate],
  );

  const displayPhrase = useCallback(
    (phrase: Phrase) => {
      setDraftDisplayPhrase(null);
      navigate(`/display/${encodeURIComponent(phrase.id)}`);
    },
    [navigate],
  );

  const practicePhrase = useCallback(
    (phrase: Phrase) => {
      navigate(`/practice?phrase=${encodeURIComponent(phrase.id)}`);
    },
    [navigate],
  );

  const toggleFavorite = useCallback(
    async (phrase: Phrase) => {
      const exists = savedPhrases.some((item) => item.id === phrase.id);

      if (exists) {
        await localPhraseRepository.toggleFavorite(phrase.id);
      } else {
        await localPhraseRepository.save({ ...phrase, isFavorite: !phrase.isFavorite });
      }

      await reloadSavedPhrases();
    },
    [reloadSavedPhrases, savedPhrases],
  );

  const deletePhrase = useCallback(
    async (phrase: Phrase) => {
      await localPhraseRepository.remove(phrase.id);
      await reloadSavedPhrases();
    },
    [reloadSavedPhrases],
  );

  const copyText = useCallback((text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }, []);

  const markPracticed = useCallback(
    async (phraseId: string) => {
      await localPhraseRepository.markPracticed(phraseId);
      await reloadSavedPhrases();
    },
    [reloadSavedPhrases],
  );

  const displayPhraseForRoute = findPhrase(route.displayId);
  const isDisplayPhraseSaved = useMemo(
    () => Boolean(displayPhraseForRoute && savedPhrases.some((phrase) => phrase.id === displayPhraseForRoute.id)),
    [displayPhraseForRoute, savedPhrases],
  );

  const page = (() => {
    switch (route.path) {
      case '/compose':
        return (
          <ComposePage
            onDisplayResult={displayConversationResult}
            onNavigate={navigate}
            onSaveResult={saveConversationResult}
          />
        );
      case '/messages':
        return (
          <MessagesPage
            onCopy={copyText}
            onDisplayResult={displayConversationResult}
            onNavigate={navigate}
            onSaveResult={saveConversationResult}
          />
        );
      case '/practice':
        return (
          <PracticePage
            savedPhrases={savedPhrases}
            selectedPhraseId={route.practicePhraseId}
            onDisplay={displayPhrase}
            onMarkPracticed={markPracticed}
            onNavigate={navigate}
            onSavePhrase={async (phrase) => {
              await savePhrase(phrase);
            }}
          />
        );
      case '/saved':
        return (
          <SavedPage
            savedPhrases={savedPhrases}
            onCopy={copyText}
            onDelete={deletePhrase}
            onDisplay={displayPhrase}
            onFavorite={toggleFavorite}
            onNavigate={navigate}
            onPractice={practicePhrase}
          />
        );
      case '/display':
        return (
          <DisplayPage
            isSaved={isDisplayPhraseSaved}
            phrase={displayPhraseForRoute}
            onBack={() => navigate('/')}
            onCopy={copyText}
            onPractice={practicePhrase}
            onSave={saveDisplayPhrase}
          />
        );
      case '/settings':
        return <SettingsPage onNavigate={navigate} />;
      default:
        return (
          <HomePage
            savedPhrases={savedPhrases}
            onDisplay={displayPhrase}
            onFavorite={toggleFavorite}
            onNavigate={navigate}
            onPractice={practicePhrase}
          />
        );
    }
  })();

  return (
    <AppShell activePath={route.path} hideNav={route.path === '/display'} onNavigate={navigate}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${route.path}-${route.displayId ?? ''}-${route.practicePhraseId ?? ''}`}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {page}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
