import { ref, h } from 'vue';
import axios from 'axios';
import { useToast } from '@/components/ui/toast/use-toast';
import { useChatAi } from '@/composables/useChatAi';
import { ToastAction } from '@/components/ui/toast';

const API_URL = 'http://localhost:3000';

interface GitState {
  isLoading: boolean;
  error: string | null;
  workspacePath: string;
  currentDiff: string;
  suggestedMessage: string;
}

const extractGitError = (error: any): string => {
  if (typeof error === 'object' && error !== null) {
    // Cas d'une réponse d'API avec data.error
    if (error.response?.data?.error) 
      return error.response.data.error;
    // Cas d'une erreur Git avec stderr
    if (error.stderr) 
      return error.stderr.trim();
    // Cas d'une erreur avec message
    if (error.message) 
      return error.message;
    // Cas d'une erreur avec la propriété error
    if (error.error) 
      return error.error;
  }
  // Fallback pour les autres types d'erreurs
  return String(error);
};

async function getBranchSuggestion(diff: string) {
  const { sendMessage } = useChatAi();
  
  const prompt = `Analyze this git diff and suggest a branch name that follows these rules:
    1. Use kebab-case (lowercase with hyphens)
    2. Start with one of these prefixes:
       - feat: for new features
       - fix: for bug fixes
       - refactor: for code changes
       - style: for styling changes
       - docs: for documentation
    3. Add a short description after the prefix
    4. Maximum 50 characters
    5. Be specific to the changes in the diff
    
    Current diff changes:
    ${diff}
    
    IMPORTANT: 
    - Respond ONLY with the branch name
    - NO explanations
    - NO quotes
    - Must be based on the actual changes in the diff`;

  try {
    const branchName = await sendMessage(prompt);
    return branchName.trim();
  } catch (error) {
    console.error('Error getting branch suggestion:', error);
    return 'feature-new-branch';
  }
}

async function getSuggestedCommitMessage(diff: string) {
  const { sendMessage } = useChatAi();
  
  const prompt = `Analyze this diff and provide ONLY a commit message following this exact format:
    <type(scope)>: <description>

    <detailed explanation by context>

    Rules to follow:
    1. NO INTRODUCTION OR EXPLANATORY TEXT
    2. Start directly with the commit type
    3. Use imperative mood
    4. First line under 50 chars
    5. Group changes by:
       * UI changes
       * Backend changes
       * Config changes
       * Performance updates
    6. Use these types and scopes:
       - feat(ui): frontend changes
       - feat(api): backend changes
       - fix(auth): auth fixes
       - refactor(core): core changes
       - style(ui): UI styling
       - docs(api): documentation
       - chore(deps): dependencies

    Here's the diff:
    ${diff}`;

  try {
    const message = await sendMessage(prompt);
    return message.trim();
  } catch (error) {
    console.error('Error getting commit message suggestion:', error);
    return 'chore: update files';
  }
}

export function useGit(onModifyCommit?: (message: string, diff: string) => void) {
  const { toast } = useToast();
  const state = ref<GitState>({
    isLoading: false,
    error: null,
    workspacePath: '',
    currentDiff: '',
    suggestedMessage: ''
  });

  // Initialiser le workspacePath
  axios.get(`${API_URL}/current-dir`)
    .then(response => {
      state.value.workspacePath = response.data.currentDirectory;
    })
    .catch(console.error);

  const executeGitCommand = async (command: string) => {
    const response = await axios.post(`${API_URL}/execute`, { command });
    return response.data.output;
  };

  const getDiff = async () => {
    try {
      // Obtenir les fichiers stagés
      let stagedFiles = (await executeGitCommand('git diff --cached --name-only'))
        .trim()
        .split('\n')
        .filter(f => f);

      if (stagedFiles.length === 0) {
        // Stage tous les fichiers si aucun n'est stagé
        await executeGitCommand('git add .');
        stagedFiles = (await executeGitCommand('git diff --cached --name-only'))
          .trim()
          .split('\n')
          .filter(f => f);
      }

      if (stagedFiles.length > 10) {
        stagedFiles = stagedFiles.sort(() => 0.5 - Math.random()).slice(0, 10);
        await executeGitCommand('git reset');

        // Stage uniquement les fichiers sélectionnés
        for (const file of stagedFiles) {
          await executeGitCommand(`git add "${file}"`);
        }
      }

      // Obtenir le diff des fichiers stagés
      return stagedFiles.length > 0 ? executeGitCommand('git diff --cached') : '';
    } catch (error) {
      console.error('Error getting diff:', error);
      throw error;
    }
  };

  const createBranch = async () => {
    state.value.isLoading = true;
    try {
      const diff = await getDiff();
      if (!diff) {
        toast({
          title: "Erreur",
          description: "Aucune modification détectée",
          variant: "destructive"
        });
        return;
      }

      const branchName = await getBranchSuggestion(diff);
      
      try {
        await executeGitCommand(`git checkout -b ${branchName}`);
        
        const { dismiss } = toast({
          title: "Branche créée",
          description: `Branche '${branchName}' créée. Voulez-vous la conserver ?`,
          action: h(ToastAction, {
            altText: 'Supprimer la branche',
            onClick: async () => {
              try {
                await executeGitCommand('git checkout main');
                await executeGitCommand(`git branch -D ${branchName}`);
                toast({
                  title: "Succès",
                  description: `Branche '${branchName}' supprimée`
                });
              } catch (error) {
                toast({
                  title: "Erreur",
                  description: extractGitError(error),
                  variant: "destructive"
                });
              }
              dismiss();
            }
          }, {
            default: () => 'Supprimer'
          }),
          duration: 10000
        });
      } catch (error) {
        // Si la branche existe déjà, proposer de la supprimer
        const errorMsg = extractGitError(error);
        if (errorMsg.includes('already exists')) {
          const { dismiss } = toast({
            title: "La branche existe déjà",
            description: `Voulez-vous supprimer la branche '${branchName}' existante ?`,
            action: h(ToastAction, {
              altText: 'Supprimer et recréer',
              onClick: async () => {
                try {
                  await executeGitCommand('git checkout main');
                  await executeGitCommand(`git branch -D ${branchName}`);
                  await executeGitCommand(`git checkout -b ${branchName}`);
                  toast({
                    title: "Succès",
                    description: `Branche '${branchName}' recréée`
                  });
                } catch (error) {
                  const msg = extractGitError(error);
                  toast({
                    title: "Erreur",
                    description: msg,
                    variant: "destructive"
                  });
                }
                dismiss();
              }
            }, {
              default: () => 'Supprimer et recréer'
            }),
            duration: 10000
          });
        } else {
          toast({
            title: "Erreur",
            description: errorMsg,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: extractGitError(error),
        variant: "destructive"
      });
    } finally {
      state.value.isLoading = false;
    }
  };

  const autoCommit = async () => {
    state.value.isLoading = true;
    try {
      const diff = await getDiff();
      if (!diff) {
        toast({
          title: "Erreur",
          description: "Aucune modification détectée",
          variant: "destructive"
        });
        return;
      }

      state.value.currentDiff = diff;
      const suggestedMessage = await getSuggestedCommitMessage(diff);
      state.value.suggestedMessage = suggestedMessage;

      if (onModifyCommit) {
        onModifyCommit(suggestedMessage, diff);
      }

      const { dismiss } = toast({
        title: "Message de commit suggéré",
        description: suggestedMessage,
        action: h('div', { class: 'flex gap-2' }, [
          h(ToastAction, {
            altText: 'Valider le commit',
            onClick: async () => {
              try {
                await executeGitCommand('git add .');
                await executeGitCommand(`git commit -m "${suggestedMessage.replace(/"/g, '\\"')}"`);
                toast({
                  title: "Succès",
                  description: "Commit effectué avec succès !"
                });
              } catch (error: any) {
                toast({
                  title: "Erreur",
                  description: error.message,
                  variant: "destructive"
                });
              }
              dismiss();
            }
          }, {
            default: () => 'Valider'
          }),
          h(ToastAction, {
            altText: 'Modifier le commit',
            onClick: () => {
              if (onModifyCommit) {
                onModifyCommit(suggestedMessage, diff);
              }
              dismiss();
            }
          }, {
            default: () => 'Modifier'
          })
        ]),
        duration: 15000
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      state.value.isLoading = false;
    }
  };

  const getCommitPrompt = (diff: string) => `Analyze this diff and provide ONLY a commit message following this exact format:
    <type(scope)>: <description>

    <detailed explanation by context>

    Rules to follow:
    1. NO INTRODUCTION OR EXPLANATORY TEXT
    2. Start directly with the commit type
    3. Use imperative mood
    4. First line under 50 chars
    5. Group changes by:
       * UI changes
       * Backend changes
       * Config changes
       * Performance updates
    6. Use these types and scopes:
       - feat(ui): frontend changes
       - feat(api): backend changes
       - fix(auth): auth fixes
       - refactor(core): core changes
       - style(ui): UI styling
       - docs(api): documentation
       - chore(deps): dependencies

    Here's the diff:
    ${diff}`;

  return {
    state,
    createBranch,
    autoCommit,
    getCommitPrompt
  };
}
