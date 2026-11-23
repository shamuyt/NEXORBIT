import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveFaultState } from '../engine/telemetrySimulator';
import type { AppSettings, FaultInjectionType, MissionControlSnapshot } from '../engine/types';

export interface MissionStreamState {
  snapshot: MissionControlSnapshot | null;
  faults: ActiveFaultState;
  wsConnected: boolean;
  loading: boolean;
  error: string | null;
  lastUpdatedUtc: string | null;
  controlSimulation: (payload: {
    action?: 'start' | 'pause' | 'reset';
    speed?: number;
    spacecraftId?: string;
  }) => Promise<void>;
  controlDemo: (payload: {
    action: 'start' | 'pause' | 'resume' | 'restart' | 'stop';
    speedMultiplier?: number;
  }) => Promise<void>;
  injectFault: (faultType: FaultInjectionType, enabled: boolean) => Promise<void>;
  acknowledgeAnomaly: (id: string) => Promise<void>;
  resolveAnomaly: (id: string) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  refreshState: () => Promise<void>;
}

const DEFAULT_FAULTS: ActiveFaultState = {
  thermalSpike: false,
  voltageDrop: false,
  commsInterruption: false,
  attitudeTumble: false,
};

export function useMissionStream(): MissionStreamState {
  const [snapshot, setSnapshot] = useState<MissionControlSnapshot | null>(null);
  const [faults, setFaults] = useState<ActiveFaultState>(DEFAULT_FAULTS);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedUtc, setLastUpdatedUtc] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetchInitialState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        snapshot: MissionControlSnapshot;
        faults: ActiveFaultState;
      };
      if (!mountedRef.current) return;
      setSnapshot(json.snapshot);
      setFaults(json.faults ?? DEFAULT_FAULTS);
      setLastUpdatedUtc(json.snapshot.serverTimeIso);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unable to reach Mission Control server');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchInitialState();

    const connectWs = () => {
      if (!mountedRef.current) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            data: MissionControlSnapshot;
            faults?: ActiveFaultState;
          };
          if (msg.data) {
            setSnapshot(msg.data);
            if (msg.faults) setFaults(msg.faults);
            setLastUpdatedUtc(msg.data.serverTimeIso);
            setLoading(false);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connectWs, 2500);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
      };
    };

    connectWs();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [fetchInitialState]);

  const postAction = useCallback(async (url: string, body?: unknown) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        snapshot: MissionControlSnapshot;
        faults?: ActiveFaultState;
      };
      if (mountedRef.current && json.snapshot) {
        setSnapshot(json.snapshot);
        if (json.faults) setFaults(json.faults);
        setLastUpdatedUtc(json.snapshot.serverTimeIso);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Command dispatch failed');
      }
    }
  }, []);

  const controlSimulation = useCallback(
    (payload: { action?: 'start' | 'pause' | 'reset'; speed?: number; spacecraftId?: string }) =>
      postAction('/api/simulation/control', payload),
    [postAction],
  );

  const controlDemo = useCallback(
    (payload: {
      action: 'start' | 'pause' | 'resume' | 'restart' | 'stop';
      speedMultiplier?: number;
    }) => postAction('/api/demo/control', payload),
    [postAction],
  );

  const injectFault = useCallback(
    (faultType: FaultInjectionType, enabled: boolean) =>
      postAction('/api/anomalies/inject', { faultType, enabled }),
    [postAction],
  );

  const acknowledgeAnomaly = useCallback(
    (id: string) => postAction(`/api/anomalies/${encodeURIComponent(id)}/acknowledge`),
    [postAction],
  );

  const resolveAnomaly = useCallback(
    (id: string) => postAction(`/api/anomalies/${encodeURIComponent(id)}/resolve`),
    [postAction],
  );

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => postAction('/api/settings', partial),
    [postAction],
  );

  return {
    snapshot,
    faults,
    wsConnected,
    loading,
    error,
    lastUpdatedUtc,
    controlSimulation,
    controlDemo,
    injectFault,
    acknowledgeAnomaly,
    resolveAnomaly,
    updateSettings,
    refreshState: fetchInitialState,
  };
}
