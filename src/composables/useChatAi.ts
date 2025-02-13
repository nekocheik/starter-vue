import axios from 'axios';
import { ref } from 'vue';
import { executeCommand } from '@/utils/commandExecutor';
import { useAIOrchestrator } from './useAIOrchestrator';

// Création d'une instance axios avec la configuration de base
const api = axios.create({
  baseURL: 'https://api.deepseek.com',
});

// Intercepteur pour ajouter le token dans les headers
api.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Message {
  content: string;
  role: 'system' | 'user' | 'assistant';
  type?: 'command' | 'message' | 'command-output';
  executedCommand?: {
    command: string;
    output: string;
  };
}

interface ChatResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }[];
  created: number;
  model: string;
  system_fingerprint: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatMode {
  name: string;
  systemMessage: string;
  icon?: string;
}

const chatModes: Record<string, ChatMode> = {
  normal: {
    name: 'Chat Normal',
    systemMessage: `Je suis un assistant polyvalent prêt à vous aider avec diverses tâches.
Pour exécuter une commande, utilisez: !exec <commande>
Par exemple: !exec git status`,
    icon: '💬'
  },
  git: {
    name: 'Git Assistant',
    systemMessage: `Je suis spécialisé dans l'aide avec Git. Je peux vous aider à :
- Comprendre les commandes Git
- Gérer vos branches et commits
- Résoudre les problèmes courants
Pour exécuter une commande git: !exec git <commande>`,
    icon: '🌳'
  },
  commit: {
    name: 'Commit Assistant',
    systemMessage: `Je suis là pour vous aider à rédiger de meilleurs messages de commit.
Je suivrai les conventions de commit conventionnel (Conventional Commits).
Format: <type>(<scope>): <description>

Types courants:
- feat: nouvelle fonctionnalité
- fix: correction de bug
- docs: documentation
- style: formatage
- refactor: refactorisation
- test: ajout de tests
- chore: tâches diverses`,
    icon: '📝'
  },
  terminal: {
    name: 'Terminal Assistant',
    systemMessage: `Je suis un assistant terminal avancé qui collabore avec une équipe d'IAs spécialisées.

Pour des tâches complexes, j'utilise le format orchestrate{{ instruction }} qui active notre système d'orchestration.

Exemples d'instructions orchestrées :
1. "Analyse le projet et suggère des améliorations"
   - L'IA Analyzer analysera le code
   - L'IA Reader lira les fichiers nécessaires
   - L'IA Synthesizer compilera les résultats

2. "Mets à jour les dépendances et documente les changements"
   - L'IA Analyzer vérifiera les dépendances
   - L'IA Executor mettra à jour les packages
   - L'IA Writer mettra à jour la documentation

3. "Crée un nouveau composant Vue avec ses tests"
   - L'IA Writer créera les fichiers
   - L'IA Analyzer vérifiera le code
   - L'IA Executor lancera les tests

Je peux aussi exécuter des commandes simples avec :
terminalCommand{{ commande }}
sequenceCommand{{ ["commande1", "commande2"] }}
fileOperation{{ ... }}
systemInfo{{ }}

Je choisirai le format approprié selon la complexité de la tâche.`,
    icon: '⌨️'
  }
};

export function useChatAi() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const messages = ref<Message[]>([]);
  const currentMode = ref<string>('normal');
  const currentStreamingMessage = ref<Message | null>(null);
  const editingCommandId = ref<number | null>(null);
  const editingCommand = ref('');
  const command = ref('');
  const output = ref('');
  const isCommandLoading = ref(false);
  const { processInstruction } = useAIOrchestrator();

  const changeMode = (mode: string) => {
    if (chatModes[mode]) {
      currentMode.value = mode;
      clearMessages();
      setSystemMessage(chatModes[mode].systemMessage);
    }
  };

  const handleTerminalResponse = async (content: string) => {
    if (content.includes('orchestrate{{')) {
      const match = content.match(/orchestrate\{\{([\s\S]*?)\}\}/);
      if (match) {
        const instruction = match[1].trim();
        
        // Informer l'utilisateur du début de l'orchestration
        messages.value.push({
          content: "🎯 Début de l'orchestration...",
          role: 'assistant',
          type: 'message'
        });

        try {
          const result = await processInstruction(instruction);
          
          // Ajouter le résultat final
          messages.value.push({
            content: "✨ Résultat de l'orchestration :\n\n" + result,
            role: 'assistant',
            type: 'message'
          });
        } catch (error) {
          messages.value.push({
            content: "❌ Erreur d'orchestration : " + error.message,
            role: 'assistant',
            type: 'message'
          });
        }
        return;
      }
    }
    
    // Si le contenu ne contient pas de format spécial, le traiter comme un message normal
    if (!content.includes('userMessage{{') && 
        !content.includes('terminalCommand{{') && 
        !content.includes('sequenceCommand{{') &&
        !content.includes('fileOperation{{') &&
        !content.includes('systemInfo{{')) {
      messages.value.push({
        content,
        role: 'assistant',
        type: 'message'
      });
      return;
    }

    // Parser et traiter chaque partie de la réponse
    const parts = content.split(/(?=userMessage\{\{|terminalCommand\{\{|sequenceCommand\{\{|fileOperation\{\{|systemInfo\{\{)/);
    
    for (const part of parts) {
      if (!part.trim()) continue;

      if (part.startsWith('sequenceCommand{{')) {
        isCommandLoading.value = true;
        try {
          const commandsMatch = part.match(/sequenceCommand\{\{([\s\S]*?)\}\}/);
          if (commandsMatch) {
            const commands = JSON.parse(commandsMatch[1]);
            
            if (Array.isArray(commands)) {
              const response = await fetch('http://localhost:3000/execute-sequence', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commands }),
              });

              const data = await response.json();
              
              // Afficher chaque commande et son résultat
              for (const result of data.results) {
                messages.value.push({
                  content: result.command,
                  role: 'assistant',
                  type: 'command'
                });

                messages.value.push({
                  content: result.output || result.error,
                  role: 'assistant',
                  type: 'command-output',
                  executedCommand: {
                    command: result.command,
                    output: result.output || result.error
                  }
                });
              }
            }
          }
        } catch (error) {
          messages.value.push({
            content: `Error executing sequence: ${error.message}`,
            role: 'assistant',
            type: 'command-output'
          });
        } finally {
          isCommandLoading.value = false;
        }
      }
      else if (part.startsWith('userMessage{{')) {
        const message = part.match(/userMessage\{\{([\s\S]*?)\}\}/)?.[1]?.trim();
        if (message) {
          messages.value.push({
            content: message,
            role: 'assistant',
            type: 'message'
          });
        }
      }
      else if (part.startsWith('terminalCommand{{')) {
        isCommandLoading.value = true;
        try {
          const command = part.match(/terminalCommand\{\{([\s\S]*?)\}\}/)?.[1]?.trim();
          if (command) {
            messages.value.push({
              content: `${command}`,
              role: 'assistant',
              type: 'command'
            });

            const output = await executeCommand(command);
            messages.value.push({
              content: output,
              role: 'assistant',
              type: 'command-output',
              executedCommand: { command, output }
            });

            // Demander à l'AI d'analyser le résultat
            const analysisResponse = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
              },
              body: JSON.stringify({
                messages: [
                  ...messages.value,
                  {
                    role: 'system',
                    content: 'Analyse le résultat ci-dessus et suggère la prochaine action pertinente si nécessaire. Utilise le format userMessage{{ }} pour ta réponse.'
                  }
                ],
                model: 'DeepSeek-V3',
                temperature: 0.7,
                max_tokens: 2048,
              }),
            });

            const analysisData = await analysisResponse.json();
            const analysis = analysisData.choices[0].message.content;
            
            if (analysis.includes('userMessage{{')) {
              const analysisMessage = analysis.match(/userMessage\{\{([\s\S]*?)\}\}/)?.[1]?.trim();
              if (analysisMessage) {
                messages.value.push({
                  content: analysisMessage,
                  role: 'assistant',
                  type: 'message'
                });
              }
            }
          }
        } finally {
          isCommandLoading.value = false;
        }
      }
      else if (part.startsWith('fileOperation{{')) {
        isCommandLoading.value = true;
        try {
          const operationMatch = part.match(/fileOperation\{\{([\s\S]*?)\}\}/);
          if (operationMatch) {
            const operation = JSON.parse(operationMatch[1]);
            
            const response = await fetch('http://localhost:3000/file-operations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(operation),
            });

            const data = await response.json();
            
            messages.value.push({
              content: `File operation result:\n${JSON.stringify(data, null, 2)}`,
              role: 'assistant',
              type: 'command-output'
            });
          }
        } catch (error) {
          messages.value.push({
            content: `Error in file operation: ${error.message}`,
            role: 'assistant',
            type: 'command-output'
          });
        } finally {
          isCommandLoading.value = false;
        }
      }
      else if (part.startsWith('systemInfo{{')) {
        isCommandLoading.value = true;
        try {
          const response = await fetch('http://localhost:3000/system-info');
          const data = await response.json();
          
          messages.value.push({
            content: `System Information:\n${JSON.stringify(data, null, 2)}`,
            role: 'assistant',
            type: 'command-output'
          });
        } catch (error) {
          messages.value.push({
            content: `Error getting system info: ${error.message}`,
            role: 'assistant',
            type: 'command-output'
          });
        } finally {
          isCommandLoading.value = false;
        }
      }
    }
  };

  const sendMessage = async (content: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      messages.value.push({
        content,
        role: 'user',
      });

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.value,
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      currentStreamingMessage.value = {
        content: '',
        role: 'assistant',
        type: currentMode.value === 'terminal' ? 'message' : undefined,
      };
      messages.value.push(currentStreamingMessage.value);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || '';
                assistantContent += content;
                
                if (currentStreamingMessage.value) {
                  currentStreamingMessage.value.content = assistantContent;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }

      // Supprimer le message de streaming temporaire
      messages.value.pop();

      // Traiter la réponse complète selon le mode
      if (currentMode.value === 'terminal') {
        await handleTerminalResponse(assistantContent);
      } else {
        messages.value.push({
          content: assistantContent,
          role: 'assistant',
        });
      }

      currentStreamingMessage.value = null;
      return assistantContent;
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message;
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const setSystemMessage = (content: string) => {
    messages.value = [{
      content,
      role: 'system',
    }];
  };

  const startEditing = (index: number, commandText: string) => {
    editingCommandId.value = index;
    editingCommand.value = commandText;
  };

  const confirmReExecuteCommand = async () => {
    if (!editingCommand.value.trim()) return;

    // Ajouter un message indiquant la réexécution
    messages.value.push({
      content: `Réexécution de la commande :`,
      role: 'assistant',
      type: 'command'
    });

    // Ajouter la commande éditée
    messages.value.push({
      content: editingCommand.value,
      role: 'assistant',
      type: 'command'
    });

    try {
      const output = await executeCommand(editingCommand.value);
      messages.value.push({
        content: output,
        role: 'assistant',
        type: 'command-output',
        executedCommand: { 
          command: editingCommand.value, 
          output 
        }
      });
    } catch (cmdError: any) {
      messages.value.push({
        content: `⚠️ Erreur: ${cmdError.message}`,
        role: 'assistant',
        type: 'command-output'
      });
    } finally {
      // Réinitialiser l'état d'édition après l'exécution
      cancelEditing();
    }
  };

  const cancelEditing = () => {
    editingCommandId.value = null;
    editingCommand.value = '';
  };

  const executeTerminalCommand = async () => {
    if (!command.value) return;

    isLoading.value = true;
    try {
      messages.value.push({
        content: command.value,
        role: 'assistant',
        type: 'command'
      });

      const cmdOutput = await executeCommand(command.value);
      output.value = cmdOutput;
      
      messages.value.push({
        content: cmdOutput,
        role: 'assistant',
        type: 'command-output',
        executedCommand: {
          command: command.value,
          output: cmdOutput
        }
      });

      command.value = '';
    } catch (cmdError: any) {
      output.value = `Error: ${cmdError.message}`;
      messages.value.push({
        content: output.value,
        role: 'assistant',
        type: 'command-output'
      });
    } finally {
      isLoading.value = false;
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    setSystemMessage,
    currentMode,
    changeMode,
    chatModes,
    editingCommandId,
    editingCommand,
    startEditing,
    confirmReExecuteCommand,
    cancelEditing,
    command,
    output,
    executeTerminalCommand,
    isCommandLoading,
  };
}
