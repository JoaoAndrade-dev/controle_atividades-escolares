# 📚 Controle de Trabalhos Escolares

Aplicação móvel desenvolvida com **React Native + Expo** para controlar o desenvolvimento de trabalhos escolares. Os dados são persistidos localmente com **SQLite** via `expo-sqlite`.

---

## 🚀 Como executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go no celular **ou** emulador Android/iOS

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npx expo start

# 3. Abrir no dispositivo
# - Escaneie o QR Code com o Expo Go (Android/iOS)
# - Pressione 'a' para Android Emulator
# - Pressione 'i' para iOS Simulator
```

---

## 📁 Estrutura do Projeto

```
SchoolWorksApp/
├── App.js                          # Ponto de entrada
├── app.json                        # Configuração Expo
├── package.json
├── babel.config.js
└── src/
    ├── database/
    │   └── database.js             # SQLite - inicialização e CRUD
    ├── navigation/
    │   └── AppNavigator.js         # Bottom Tabs + Stack Navigation
    ├── screens/
    │   ├── StudentsScreen.js       # CRUD de Alunos
    │   ├── WorksScreen.js          # Lista de Trabalhos
    │   ├── WorkDetailScreen.js     # CRUD de Trabalho + Atividades
    │   ├── ActivitiesProgressScreen.js  # Andamento das atividades
    │   └── ChartScreen.js          # Gráfico de progresso
    └── theme/
        └── colors.js               # Paleta de cores e constantes
```

---

## 🗄️ Modelo de Dados (SQLite)

### Tabela `students`
| Campo       | Tipo    | Descrição           |
|-------------|---------|---------------------|
| id          | INTEGER | PK autoincrement    |
| name        | TEXT    | Nome do aluno       |
| email       | TEXT    | E-mail (opcional)   |
| phone       | TEXT    | Telefone (opcional) |
| created_at  | DATETIME| Data de criação     |

### Tabela `works`
| Campo         | Tipo    | Descrição                         |
|---------------|---------|-----------------------------------|
| id            | INTEGER | PK autoincrement                  |
| name          | TEXT    | Nome do trabalho                  |
| delivery_date | TEXT    | Data de entrega (YYYY-MM-DD)      |
| total_hours   | REAL    | Estimativa total de horas         |
| status        | TEXT    | pending / completed / cancelled   |
| description   | TEXT    | Descrição (opcional)              |

### Tabela `work_students` (N:N)
| Campo      | Tipo    | Descrição           |
|------------|---------|---------------------|
| work_id    | INTEGER | FK → works.id       |
| student_id | INTEGER | FK → students.id    |

### Tabela `activities`
| Campo           | Tipo    | Descrição                       |
|-----------------|---------|---------------------------------|
| id              | INTEGER | PK autoincrement                |
| work_id         | INTEGER | FK → works.id                   |
| description     | TEXT    | Descrição da atividade          |
| student_id      | INTEGER | FK → students.id                |
| status          | TEXT    | pending / completed / cancelled |
| estimated_hours | REAL    | Estimativa de horas             |
| worked_hours    | REAL    | Horas já trabalhadas            |

---

## 📱 Telas

### 1. Alunos
- Listar, adicionar, editar e excluir alunos
- Busca por nome
- Campos: Nome, E-mail, Telefone

### 2. Trabalhos
- Listar trabalhos com barra de progresso
- Status colorido (Pendente / Concluído / Cancelado)
- Navegar para detalhes/edição

### 3. Detalhe do Trabalho
- Criar/editar trabalho (nome, data, horas, status, descrição)
- Selecionar alunos participantes
- Adicionar/editar/excluir atividades do trabalho
- Cada atividade: descrição, aluno responsável, status, estimativa de horas

### 4. Andamento
- Selecionar trabalho via picker
- Ver todas as atividades com progresso visual
- Atualizar horas trabalhadas e situação de cada atividade
- Painel resumo com totais

### 5. Gráficos
- Selecionar trabalho
- Visão geral: contagem por status (pendente/concluído/cancelado)
- Barra de progresso total (horas trabalhadas vs estimadas)
- Gráfico de barras horizontal por atividade
  - Barra cinza = horas estimadas
  - Barra colorida = horas trabalhadas

---

## 🎨 Design

- **Cores**: Navy escuro (#1B3A6B) + Teal (#00BFA5) + branco
- **Tipografia**: Sistema nativo
- **Componentes**: Cards com sombra, badges de status coloridos, barras de progresso animadas
- **UX**: Bottom tab navigation, modais bottom-sheet, feedback visual

---

## 📦 Dependências principais

| Pacote | Uso |
|--------|-----|
| `expo-sqlite` | Banco de dados local SQLite |
| `@react-navigation/native` | Navegação |
| `@react-navigation/bottom-tabs` | Abas inferiores |
| `@react-navigation/native-stack` | Navegação em pilha |
| `@react-native-picker/picker` | Componente de seleção |
| `@expo/vector-icons` | Ícones Ionicons |
