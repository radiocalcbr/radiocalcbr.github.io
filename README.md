# ☢️🩺 RadioCalc BR (v1.6 beta)

O **RadioCalc BR** é uma aplicação web moderna e modular desenvolvida especificamente para auxiliar médicos nucleares, físicos médicos, técnicos e profissionais de saúde na realização de cálculos precisos, controlo de qualidade, gestão de stocks, registo de rejeitos e administração de radiofármacos em serviços de Medicina Nuclear.

---

## 🚀 Funcionalidades Principais

* **Autenticação e Segurança**: Sistema completo de login, registo e recuperação de senha integrado ao **Firebase Auth**.
* **Planeamento de Atividade (SPECT e PET-CT)**:
  * Suporte para múltiplos isótopos: **Tc-99m**, **F-18** e **I-123**.
  * Modos de planeamento flexíveis: *Simplificado* (intervalo fixo) e *Por Agenda* (horários individuais por paciente).
  * Calculadora de múltiplas eluições para geradores de Mo-99/Tc-99m.
  * Curvas de decaimento dinâmicas geradas com Chart.js[cite: 2].
* **Marcação e Controlo de Qualidade**:
  * Registo de marcação de radiofármacos (DMSA, DTPA, MDP, MIBI, FDG, MIBG, entre outros)[cite: 2].
  * Avaliação da eficiência de marcação e pureza radioquímica (com base na USP 40)[cite: 2].
* **Administração de Pacientes**:
  * Registo de doses administradas, cálculo de peso, dose por kg, decaimento radioativo e rejeitos[cite: 2].
* **Dose Pediátrica**:
  * Cálculos baseados nas diretrizes internacionais **SNMMI 2024** e **EANM 2005**, com limites mínimos e máximos por faixa etária/peso[cite: 2].
* **Módulos e Ferramentas Adicionais**:
  * 📦 **Gestão de Stock de Kits**: Controlo de entradas, saídas, lotes, validades e sincronização na nuvem[cite: 2].
  * ☢️ **Registo de Rejeitos**: Controlo de resíduos radioativos sólidos e líquidos com validação por supervisor[cite: 2].
  * ⚛️ **Registo de Geradores**: Ciclo de vida completo do gerador Mo-99/Tc-99m[cite: 2].
  * 💰 **Análise de Custos**: Módulo administrativo para gestão de preços por frasco, atividade e indicadores financeiros[cite: 2].
* **Exportação e Relatórios**:
  * Exportação de dados e relatórios detalhados para formatos **Excel** (`xlsx`) e **PDF** (`html2pdf`)[cite: 2].
* **Multilíngue**: Suporte a múltiplos idiomas (com foco atual em Português)[cite: 2].

---

## 🛠️ Tecnologias Utilizadas

* **HTML5, CSS3 & JavaScript (ES6+)**[cite: 2]
* **Firebase (v10.7.1)** (Auth e Firestore para persistência e sincronização de dados em tempo real)[cite: 2]
* **Chart.js** (Gráficos dinâmicos de decaimento e custos)[cite: 2]
* **SheetJS (xlsx)** & **html2pdf.js** (Exportação de planilhas e relatórios)[cite: 2]

---

## 📂 Estrutura do Projeto

```text
radiocalc-br/
├── index.html            # Interface principal da aplicação (Single Page Application)
├── assets/
│   ├── css/
│   │   └── style.css     # Estilos visuais personalizados do sistema
│   └── js/
│       ├── config.js         # Configurações globais
│       ├── traducoes.js      # Gestão de idiomas
│       ├── utils.js          # Funções matemáticas e utilitárias (decaimento, etc.)
│       ├── planejamento.js   # Lógica da aba de Planeamento
│       ├── pacientes.js      # Gestão de pacientes e injeções
│       ├── marcacao.js       # Regras de marcação e radiofármacos
│       ├── pediatrico.js     # Cálculos pediátricos (SNMMI 2024 / EANM 2005)
│       ├── interface.js      # Manipulação de elementos de UI e abas
│       ├── salvar.js         # Gestão de salvamento local e nuvem
│       ├── historico.js      # Histórico de cálculos
│       ├── graficos.js       # Integração com Chart.js
│       ├── main.js           # Ponto de entrada e inicialização geral
│       ├── firebase-auth.js  # Autenticação e ligação ao Firebase
│       ├── estoque.js        # Gestão de stock de kits
│       ├── rejeitos.js       # Controlo de rejeitos radioativos
│       ├── gerador.js        # Controlo do gerador Mo-99/Tc-99m
│       ├── cloud-estoque.js  # Sincronização de stock na nuvem
│       ├── cloud-gerador.js  # Sincronização de geradores na nuvem
│       ├── doses.js          # Registo e histórico de doses
│       ├── custos.js         # Análise de custos e preços
│       └── sessao-timeout.js # Controlo de sessão de utilizador
└── README.md
## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
