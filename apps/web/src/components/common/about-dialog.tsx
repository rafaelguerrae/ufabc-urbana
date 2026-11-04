"use client";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <div className="absolute inset-0 z-20 flex animate-fade items-center justify-center bg-black/45 p-4 motion-reduce:animate-none" onClick={onClose}>
      <section
        className="flex max-h-full w-[520px] max-w-full animate-pop flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-background p-6 text-[0.9rem] leading-normal text-foreground shadow-panel motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="about-title" className="text-[1.25rem]">
            Sobre os dados
          </h2>
          <button type="button" className="size-9 cursor-pointer rounded-lg border-0 bg-transparent text-[1.5rem] leading-none text-muted hover:bg-hover hover:text-foreground focus-visible:bg-hover focus-visible:text-foreground" onClick={onClose} aria-label="Fechar" autoFocus>
            ×
          </button>
        </div>
        <p>
          Este mapa mostra como a temperatura da superfície e a vegetação variam em São Paulo, São Bernardo do Campo e Santo André. Os valores vêm de imagens
          de satélite e de dados oficiais; nada aqui é previsão ou simulação.
        </p>
        <ul className="list-disc pl-5 text-muted">
          <li>Temperatura e vegetação: satélites Landsat 8 e 9, processados no Google Earth Engine.</li>
          <li>
            Distritos (São Paulo), bairros (São Bernardo do Campo e Santo André) e densidade demográfica: IBGE, Censo
            2022. Os bairros são os do Censo e podem diferir dos bairros oficiais de cada prefeitura.
          </li>
          <li>Área urbanizada: MapBiomas, Coleção 11.</li>
          <li>
            Edifícios em 3D: contornos e alturas do OpenStreetMap, © colaboradores do OpenStreetMap (licença ODbL).
            Só entram prédios com altura ou número de andares registrado por voluntários; a cobertura é desigual.
          </li>
          <li>Busca de endereços: Photon, © colaboradores do OpenStreetMap.</li>
          <li>Mapa-base: © CARTO.</li>
          <li>
            Sua localização: só é pedida quando você toca no botão de localização e é usada apenas no seu navegador
            para mostrar o ponto azul. Ela não é enviada nem guardada.
          </li>
        </ul>
        <p>
          Código aberto:{" "}
          <a className="text-accent underline" href="https://github.com/rafaelguerrae/ufabc-urbana" target="_blank" rel="noopener noreferrer">
            github.com/rafaelguerrae/ufabc-urbana
          </a>
        </p>
        <p>
          Os dados mostram associações, não causas. A temperatura da superfície não é a temperatura do ar, e cada camada
          tem sua própria escala (pixel de 30 m, distrito ou bairro). Distritos e bairros têm tamanhos muito diferentes, então compare cada cidade com ela mesma. Em São Bernardo do Campo e Santo André, a "área sem bairro" reúne trechos sem moradores que o IBGE não classificou em nenhum bairro.
        </p>
      </section>
    </div>
  );
}
