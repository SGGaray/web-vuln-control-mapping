import type { MappingContentCatalog } from "./types";

export const mappingContentEsAR = {
  rationales: {
    XSS: {
      classification: "XSS está incluido en A03:2021 porque los datos no confiables pueden interpretarse como contenido activo en el navegador.",
      inputValidation: "SI-10 tiene una relación fuerte con la validación de entradas externas antes de que crucen un límite de confianza; XSS también requiere codificación o sanitización según el contexto final de salida.",
      injectionPrevention: "SI-10(6) aborda directamente la prevención de que una entrada no confiable se interprete como comandos o código, incluido el contenido activo en el navegador.",
      secureCoding: "A.8.28 respalda prácticas de diseño e implementación segura, como la codificación según contexto y evitar sinks inseguros en el navegador.",
    },
    "SQL Injection": {
      classification: "SQL Injection está incluido en A03:2021 porque una entrada puede cambiar la sintaxis o el significado de una consulta a la base de datos.",
      inputValidation: "SI-10 tiene una relación fuerte con la validación de entradas externas, mientras que las consultas parametrizadas establecen la separación principal entre datos y sintaxis SQL.",
      injectionPrevention: "SI-10(6) aborda directamente la prevención de que una entrada no confiable se interprete como comandos de base de datos.",
      secureCoding: "A.8.28 respalda prácticas de desarrollo seguro como consultas parametrizadas, mínimo privilegio y manejo seguro de errores.",
    },
    "Command Injection": {
      classification: "OS Command Injection está incluido en A03:2021 porque una entrada puede alterar comandos enviados a un shell.",
      inputValidation: "SI-10 tiene una relación fuerte con la validación de entradas externas, mientras que evitar la invocación de un shell y usar arrays de argumentos fijos establece el límite principal.",
      injectionPrevention: "SI-10(6) aborda directamente la prevención de que una entrada no confiable se interprete como comandos del sistema operativo.",
      secureCoding: "A.8.28 respalda prácticas de desarrollo seguro como APIs de procesos sin shell, argumentos permitidos explícitamente y mínimo privilegio.",
    },
  },
  limitations: {
    classification: "OWASP Top 10 es una clasificación para concientización sobre riesgos; no es un catálogo de controles ni demuestra que exista una vulnerabilidad.",
    inputValidation: "La validación de entradas por sí sola no evita todas las vías de inyección; el límite con el intérprete y el contexto de salida todavía requieren protecciones específicas.",
    injectionPrevention: "Una relación conceptual directa no demuestra que la mejora esté implementada, probada o sea efectiva en un sistema particular.",
    secureCoding: "A.8.28 es más amplio que la prevención de inyecciones y no establece una protección técnica específica sin implementación y evidencia propias de la organización.",
  },
} satisfies MappingContentCatalog;
