/**
 * krocks_ws.js  –  Krock's Apex WebSocket client hook
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = '/ws';  // proxied by Vite → 127.0.0.1:7860

export function useKrocksWS({ onChunk, onDone, onAction, onSystem, onError, onSessions, onHistoryLoaded, onStatus, onBranches, onSaveOk, onProjects, onFolderChosen, onScreenshotTaken, onSkills, onConnectors, onPlugins, generationRef }) {
  const wsRef       = useRef(null);
  const retryCount  = useRef(0);
  const retryTimer  = useRef(null);
  const isUnmounted = useRef(false);
  const maxRetries  = 5;
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    // Unmount oldan sonra connect çağrılırsa iptal et (StrictMode/HMR sızıntısını önler)
    if (isUnmounted.current) return;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryCount.current = 0;
    };

    ws.onclose = () => {
      setConnected(false);
      if (isUnmounted.current) return;
      if (retryCount.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 10000);
        retryCount.current++;
        retryTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); }
      catch { data = { type: 'chunk', text: event.data }; }

      switch (data.type) {
        case 'chunk':          onChunk?.(data.text ?? '', generationRef?.current);break;
        case 'done':           onDone?.(data, generationRef?.current);            break;
        case 'action':         onAction?.(data);                                  break;
        case 'system':         onSystem?.(data.text ?? '');                       break;
        case 'error':          onError?.(data.text ?? 'Unknown error');           break;
        case 'sessions':       onSessions?.(data.sessions ?? []);                 break;
        case 'history_loaded': onHistoryLoaded?.(data.history ?? []);             break;
        case 'status_result':  onStatus?.(data);                                  break;
        case 'branches_listed':onBranches?.(data.branches ?? [], data.current ?? 'main'); break;
        case 'folder_chosen':  onFolderChosen?.(data.path);                       break;
        case 'save_ok':        onSystem?.(`💾 Saved: ${data.name}`);    onSaveOk?.(data.name); break;
        case 'reset_ok':       onSystem?.('🔄 Chat reset');                       break;
        case 'cwd_set':        onSystem?.(`📁 Folder: ${data.path}`);             break;
        case 'projects':       onProjects?.(data.projects ?? []);                 break;
        case 'skills_data':    onSkills?.(data.skills ?? []);                     break;
        case 'connectors_data':onConnectors?.(data.connectors ?? []);             break;
        case 'plugins_data':   onPlugins?.(data.plugins ?? []);                   break;
        case 'screenshot_taken': onScreenshotTaken?.(data.base64);                break;
        default: break;
      }
    };
  }, [onChunk, onDone, onAction, onSystem, onError, onSessions, onHistoryLoaded, onStatus, onBranches, onSaveOk, onScreenshotTaken, onProjects, onSkills, onConnectors, onPlugins]);

  useEffect(() => {
    isUnmounted.current = false;
    connect();
    return () => {
      isUnmounted.current = true;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;   // Yeniden bağlanma tetiklemesin
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const send = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }, []);

  const sendMessage     = useCallback((text, opts = {}) => send({ type: 'message', text, ...opts }), [send]);
  const sendConfig      = useCallback((cfg)             => send({ type: 'config',  ...cfg }),        [send]);
  const resetChat       = useCallback(()               => send({ type: 'reset' }),                   [send]);
  const saveSession     = useCallback((name = '', mode = '')      => send({ type: 'save_session', name, mode }),       [send]);
  const loadSession     = useCallback((name)           => send({ type: 'load_session', name }),       [send]);
  const deleteSession   = useCallback((name)           => send({ type: 'delete_session', name }),     [send]);
  const listSessions    = useCallback(()               => send({ type: 'list_sessions' }),            [send]);
  const checkStatus     = useCallback(()               => send({ type: 'check_status' }),             [send]);
  const getArtifacts    = useCallback(()               => send({ type: 'get_artifacts' }),            [send]);
  const getSkills       = useCallback(()               => send({ type: 'get_skills' }),               [send]);
  const exportChat      = useCallback(()               => send({ type: 'export' }),                   [send]);
  const abortStream     = useCallback(()               => send({ type: 'abort' }),                    [send]);
  const setCwd          = useCallback((path)           => send({ type: 'set_cwd', path }),            [send]);
  const listBranches    = useCallback(()               => send({ type: 'list_branches' }),            [send]);
  const checkoutBranch  = useCallback((branch)         => send({ type: 'checkout_branch', branch }),  [send]);
  const toggleWorktree  = useCallback((enabled, path)  => send({ type: 'worktree', enabled, path }),  [send]);

  return {
    connected,
    sendMessage, sendConfig, resetChat,
    saveSession, loadSession, deleteSession, listSessions,
    checkStatus, getArtifacts, getSkills, exportChat, abortStream,
    setCwd, listBranches, checkoutBranch, toggleWorktree,
    sendRaw: send
  };
}
