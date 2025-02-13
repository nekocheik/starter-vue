import { ref } from 'vue';
import { AIOrchestrator } from './AIOrchestrator';

export function useAIOrchestrator() {
  const orchestrator = new AIOrchestrator();
  const isProcessing = ref(false);
  const currentTask = ref<string | null>(null);

  const processInstruction = async (instruction: string) => {
    isProcessing.value = true;
    currentTask.value = 'Analyzing instruction...';
    
    try {
      const result = await orchestrator.orchestrate(instruction);
      return result;
    } finally {
      isProcessing.value = false;
      currentTask.value = null;
    }
  };

  return {
    processInstruction,
    isProcessing,
    currentTask
  };
}
