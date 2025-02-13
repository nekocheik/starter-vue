import { ref } from 'vue';
import axios from 'axios';

interface AICapability {
  name: string;
  description: string;
  examples: string[];
}

interface AIRole {
  name: string;
  capabilities: AICapability[];
  context: string;
  limitations: string[];
}

const AI_ROLES: Record<string, AIRole> = {
  analyzer: {
    name: 'Analyzer AI',
    capabilities: [
      {
        name: 'Code Analysis',
        description: 'Analyser le code source et identifier les patterns, problèmes et améliorations possibles',
        examples: [
          'Analyser la structure d\'un projet Vue.js',
          'Identifier les problèmes de performance',
          'Suggérer des refactorisations'
        ]
      },
      {
        name: 'Dependency Analysis',
        description: 'Analyser les dépendances et leur utilisation',
        examples: [
          'Vérifier les versions des packages',
          'Identifier les dépendances obsolètes',
          'Suggérer des mises à jour'
        ]
      }
    ],
    context: 'Accès en lecture seule au code source et aux fichiers de configuration',
    limitations: [
      'Ne peut pas modifier le code directement',
      'Ne peut pas installer de packages'
    ]
  },
  executor: {
    name: 'Executor AI',
    capabilities: [
      {
        name: 'Command Execution',
        description: 'Exécuter des commandes système et npm de manière sécurisée',
        examples: [
          'npm install <package>',
          'git status',
          'vue-cli-service serve'
        ]
      },
      {
        name: 'Script Execution',
        description: 'Exécuter des scripts Node.js et shell',
        examples: [
          'Exécuter des tests',
          'Builder le projet',
          'Démarrer les services'
        ]
      }
    ],
    context: 'Environnement d\'exécution Node.js et shell',
    limitations: [
      'Commandes limitées à une liste blanche',
      'Pas d\'accès root/admin',
      'Timeout de 30 secondes par commande'
    ]
  },
  writer: {
    name: 'Writer AI',
    capabilities: [
      {
        name: 'File Creation',
        description: 'Créer de nouveaux fichiers selon les templates et standards',
        examples: [
          'Créer un composant Vue',
          'Générer un fichier de configuration',
          'Créer des tests unitaires'
        ]
      },
      {
        name: 'Code Modification',
        description: 'Modifier le code existant de manière sûre',
        examples: [
          'Ajouter des méthodes',
          'Refactoriser du code',
          'Mettre à jour la documentation'
        ]
      }
    ],
    context: 'Accès en écriture aux fichiers sources avec validation',
    limitations: [
      'Modifications soumises à validation',
      'Pas de suppression de fichiers',
      'Respect strict des conventions de code'
    ]
  },
  reader: {
    name: 'Reader AI',
    capabilities: [
      {
        name: 'File Reading',
        description: 'Lire et interpréter les fichiers du projet',
        examples: [
          'Lire les fichiers de configuration',
          'Analyser les sources',
          'Extraire la documentation'
        ]
      },
      {
        name: 'Project Structure Analysis',
        description: 'Analyser la structure du projet',
        examples: [
          'Mapper l\'arborescence',
          'Identifier les dépendances',
          'Analyser l\'architecture'
        ]
      }
    ],
    context: 'Accès en lecture seule à tous les fichiers',
    limitations: [
      'Pas d\'accès en écriture',
      'Pas d\'exécution de code'
    ]
  },
  synthesizer: {
    name: 'Synthesizer AI',
    capabilities: [
      {
        name: 'Result Compilation',
        description: 'Compiler et formater les résultats des autres AIs',
        examples: [
          'Générer des rapports',
          'Créer des résumés',
          'Formatter les outputs'
        ]
      },
      {
        name: 'Decision Making',
        description: 'Prendre des décisions basées sur les analyses',
        examples: [
          'Suggérer des actions',
          'Prioriser les tâches',
          'Évaluer les risques'
        ]
      }
    ],
    context: 'Accès aux résultats des autres AIs',
    limitations: [
      'Pas d\'accès direct aux fichiers',
      'Pas d\'exécution de commandes'
    ]
  }
};

interface AITask {
  id: string;
  type: 'analyze' | 'execute' | 'write' | 'read' | 'synthesize';
  input: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
}

interface ChildAI {
  id: string;
  type: 'analyzer' | 'executor' | 'writer' | 'reader' | 'synthesizer';
  status: 'idle' | 'busy';
  currentTask?: AITask;
}

export class AIOrchestrator {
  private memory = new Map<string, any>();
  private childAIs = new Map<string, ChildAI>();
  private tasks = ref<AITask[]>([]);
  private api = axios.create({
    baseURL: 'https://api.deepseek.com',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
    }
  });

  constructor() {
    this.initializeChildAIs();
  }

  private initializeChildAIs() {
    this.childAIs.set('analyzer', {
      id: 'analyzer',
      type: 'analyzer',
      status: 'idle'
    });
    this.childAIs.set('executor', {
      id: 'executor',
      type: 'executor',
      status: 'idle'
    });
    this.childAIs.set('writer', {
      id: 'writer',
      type: 'writer',
      status: 'idle'
    });
    this.childAIs.set('reader', {
      id: 'reader',
      type: 'reader',
      status: 'idle'
    });
    this.childAIs.set('synthesizer', {
      id: 'synthesizer',
      type: 'synthesizer',
      status: 'idle'
    });
  }

  async orchestrate(instruction: string) {
    try {
      // 1. Analyser l'instruction avec l'IA principale
      const taskPlan = await this.createTaskPlan(instruction);
      
      // 2. Exécuter les tâches en séquence
      const results = await this.executeTasks(taskPlan);
      
      // 3. Synthétiser les résultats
      return await this.synthesizeResults(results);
    } catch (error) {
      console.error('Orchestration error:', error);
      throw error;
    }
  }

  private async createTaskPlan(instruction: string) {
    const systemPrompt = `Je suis l'IA Orchestratrice. Je coordonne une équipe d'IAs spécialisées :

${Object.entries(AI_ROLES).map(([key, role]) => `
${role.name}:
- Capacités: ${role.capabilities.map(c => c.name).join(', ')}
- Contexte: ${role.context}
- Limitations: ${role.limitations.join(', ')}
`).join('\n')}

Analysez l'instruction suivante et créez un plan d'exécution optimal en utilisant les capacités de chaque IA.
Format de réponse attendu: JSON avec la structure suivante:
{
  "tasks": [
    {
      "id": "unique_id",
      "aiType": "analyzer|executor|writer|reader|synthesizer",
      "action": "nom_de_l_action",
      "input": "données_d_entrée",
      "expectedOutput": "format_de_sortie_attendu",
      "dependencies": ["id_des_taches_requises"]
    }
  ]
}`;

    const response = await this.api.post('/chat/completions', {
      model: 'DeepSeek-V3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: instruction }
      ]
    });

    return JSON.parse(response.data.choices[0].message.content);
  }

  private async executeTasks(tasks: any[]) {
    const results = [];
    
    for (const task of tasks) {
      const childAI = this.childAIs.get(this.getAITypeForTask(task.type));
      if (!childAI) continue;

      childAI.status = 'busy';
      try {
        const result = await this.executeChildAITask(childAI, task);
        this.memory.set(`task_${task.id}`, result);
        results.push(result);
      } finally {
        childAI.status = 'idle';
      }
    }

    return results;
  }

  private async executeChildAITask(childAI: ChildAI, task: AITask) {
    const response = await this.api.post('/chat/completions', {
      model: 'DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: this.getChildAISystemPrompt(childAI.type)
        },
        {
          role: 'user',
          content: JSON.stringify(task)
        }
      ]
    });

    return response.data.choices[0].message.content;
  }

  private async synthesizeResults(results: any[]) {
    const response = await this.api.post('/chat/completions', {
      model: 'DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: 'You are a synthesis AI. Combine and summarize the following results into a coherent response.'
        },
        {
          role: 'user',
          content: JSON.stringify(results)
        }
      ]
    });

    return response.data.choices[0].message.content;
  }

  private getAITypeForTask(taskType: string): string {
    const mapping: Record<string, string> = {
      'analyze': 'analyzer',
      'execute': 'executor',
      'write': 'writer',
      'read': 'reader',
      'synthesize': 'synthesizer'
    };
    return mapping[taskType] || 'analyzer';
  }

  private getChildAISystemPrompt(type: string): string {
    const prompts: Record<string, string> = {
      'analyzer': `You are an analysis AI specialized in understanding and breaking down problems.
                  Analyze the given input and provide detailed insights.`,
      'executor': `You are an execution AI specialized in running commands and scripts.
                  Execute the given tasks and provide detailed output.`,
      'writer': `You are a writer AI specialized in creating and modifying content.
                Create or modify content based on the given instructions.`,
      'reader': `You are a reader AI specialized in extracting and understanding information.
                Read and analyze the given content.`,
      'synthesizer': `You are a synthesis AI specialized in combining information.
                     Synthesize the given inputs into a coherent output.`
    };
    return prompts[type] || '';
  }
}
