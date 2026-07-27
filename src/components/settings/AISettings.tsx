"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { Sparkles, Save, Server, Globe } from "lucide-react";

export function AISettings() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
    apiKey: ""
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.provider === 'ollama' && ollamaModels.length === 0 && !loadingModels) {
      loadOllamaModels();
    }
  }, [settings.provider]);

  const loadOllamaModels = async () => {
    setLoadingModels(true);
    try {
      const data = await api.ai.getOllamaModels();
      if (data.models) {
        setOllamaModels(data.models);
        // If current model isn't in the list, auto-select the first one
        if (data.models.length > 0 && !data.models.includes(settings.model)) {
          setSettings(s => ({...s, model: data.models[0]}));
        }
      }
    } catch (e) {
      console.error("Failed to load Ollama models", e);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.ai.getSettings();
      if (data.aiSettings) setSettings(data.aiSettings);
    } catch (e) {
      toastError("Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.ai.updateSettings(settings);
      success("AI settings saved successfully");
    } catch (e) {
      toastError("Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading AI Settings...</div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" /> AI Auto-Fix Configuration
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure the AI engine used to automatically repair failed deployments.</p>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSettings({ ...settings, provider: 'openrouter' })}
              className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-colors ${
                settings.provider === 'openrouter' 
                  ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600/20' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Globe className={`h-6 w-6 shrink-0 ${settings.provider === 'openrouter' ? 'text-indigo-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-semibold ${settings.provider === 'openrouter' ? 'text-indigo-900' : 'text-gray-700'}`}>OpenRouter (Cloud)</p>
                <p className="text-xs text-gray-500 mt-1">Use powerful cloud models like Google Gemini, Anthropic Claude, or Meta Llama 3.</p>
              </div>
            </button>
            <button
              onClick={() => setSettings({ ...settings, provider: 'ollama' })}
              className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-colors ${
                settings.provider === 'ollama' 
                  ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600/20' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Server className={`h-6 w-6 shrink-0 ${settings.provider === 'ollama' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-semibold ${settings.provider === 'ollama' ? 'text-emerald-900' : 'text-gray-700'}`}>Ollama (Local)</p>
                <p className="text-xs text-gray-500 mt-1">Run AI completely offline on your own server. (Requires Ollama running on localhost:11434).</p>
              </div>
            </button>
          </div>
        </div>

        {settings.provider === 'openrouter' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OpenRouter API Key</label>
              <input 
                type="password" 
                value={settings.apiKey}
                onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                placeholder="sk-or-v1-..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Get a free key from <a href="https://openrouter.ai/keys" target="_blank" className="text-indigo-600 hover:underline">openrouter.ai</a></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input 
                type="text" 
                value={settings.model}
                onChange={(e) => setSettings({...settings, model: e.target.value})}
                placeholder="google/gemini-2.5-flash"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Free models: google/gemini-2.5-flash, meta-llama/llama-3-8b-instruct:free</p>
            </div>
          </div>
        )}

        {settings.provider === 'ollama' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ollama Model</label>
              <div className="flex gap-2">
                {loadingModels ? (
                  <div className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm bg-gray-50 text-gray-500 font-mono animate-pulse">
                    Loading models...
                  </div>
                ) : ollamaModels.length > 0 ? (
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono bg-white"
                  >
                    {ollamaModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    placeholder="llama3"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                )}
                <button 
                  onClick={loadOllamaModels}
                  disabled={loadingModels}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  title="Refresh models"
                >
                  ↻
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {ollamaModels.length > 0 
                  ? "Select a model installed on your Ollama server." 
                  : "Could not auto-detect models. Ensure Ollama is running, or type the name manually (e.g. llama3)."}
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
