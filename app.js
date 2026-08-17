/* ═══════════════════════════════════════════════════════════════════════
 * CapCut Club · comportamiento
 *
 * Sin dependencias, sin build. Cuatro piezas independientes: si una falla
 * o el navegador no soporta algo, las otras siguen funcionando y la
 * página sigue siendo usable sin JS.
 * ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var menosMovimiento =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 1 · Aparición al entrar en pantalla ─────────────────────────────
   * Con reduced-motion el CSS ya deja todo visible, así que aquí no hay
   * nada que hacer. Sin IntersectionObserver se muestran todos de golpe:
   * que se vea sin animación es correcto; que no se vea, no.
   * ─────────────────────────────────────────────────────────────────── */
  function iniciarRevelar() {
    var nodos = document.querySelectorAll("[data-revelar]");
    if (!nodos.length) return;

    if (menosMovimiento || !("IntersectionObserver" in window)) {
      for (var i = 0; i < nodos.length; i++) nodos[i].classList.add("visible");
      return;
    }

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    for (var j = 0; j < nodos.length; j++) observador.observe(nodos[j]);
  }

  /* ── 2 · Barra fija de compra ────────────────────────────────────────
   * Se despliega cuando el hero ya salió POR ARRIBA, no simplemente
   * cuando "no se ve": sin comprobar la posición, la barra aparecería
   * también antes de llegar al hero si algún día deja de ser lo primero.
   *
   * El alto real se mide y se publica como --barra-alto para que el
   * padding del final de la página y el botón de WhatsApp se aparten
   * exactamente lo que mide, ni un píxel de más.
   * ─────────────────────────────────────────────────────────────────── */
  function iniciarBarraFija() {
    var barra = document.querySelector("[data-barra-fija]");
    var hero = document.querySelector("[data-fin-hero]");
    if (!barra || !hero) return;

    var medir = function () {
      var alto = barra.offsetHeight;
      if (alto > 0) {
        document.documentElement.style.setProperty("--barra-alto", alto + "px");
      }
    };
    medir();
    if ("ResizeObserver" in window) new ResizeObserver(medir).observe(barra);

    var mostrar = function (debe) {
      barra.classList.toggle("visible", debe);
      document.body.classList.toggle("con-barra", debe);
    };

    // Sin IntersectionObserver la barra se queda visible desde el inicio:
    // se pierde la entrada elegante, no la posibilidad de comprar.
    if (!("IntersectionObserver" in window)) {
      mostrar(true);
      return;
    }

    var observador = new IntersectionObserver(
      function (entradas) {
        var entrada = entradas[entradas.length - 1];
        if (!entrada) return;
        var fueraPorArriba = !entrada.isIntersecting && entrada.boundingClientRect.top < 0;
        mostrar(fueraPorArriba);
      },
      { threshold: 0 }
    );
    observador.observe(hero);
  }

  /* ── 3 · Cupos disponibles — simulados ───────────────────────────────
   * Mismo comportamiento que en plan-edicion-total: arranca en el valor
   * de data-cupos-inicial y baja de a uno, a intervalos irregulares.
   * Nunca llega a cero — "0 cupos" se lee como que ya no se puede
   * comprar, y sí se puede. Por eso hay piso.
   *
   * Es urgencia simulada, no inventario real: los dos números viven en
   * data-* del HTML para que se ajusten sin tocar este archivo.
   * ─────────────────────────────────────────────────────────────────── */
  function iniciarCupos() {
    var config = document.querySelector("[data-cupos-config]");
    var objetivos = document.querySelectorAll("[data-cupos]");
    if (!config || !objetivos.length) return;

    var piso = Number(config.getAttribute("data-cupos-piso") || 7);
    var actual = Number(config.getAttribute("data-cupos-inicial") || 100);

    var pintar = function () {
      for (var i = 0; i < objetivos.length; i++) {
        objetivos[i].textContent = String(actual);
      }
    };
    pintar();

    if (menosMovimiento) return;

    var siguiente = function () {
      if (actual <= piso) return;
      window.setTimeout(
        function () {
          actual = Math.max(piso, actual - 1);
          pintar();
          siguiente();
        },
        6000 + Math.random() * 14000
      );
    };
    siguiente();
  }

  /* ── 4 · Reproductor de los testimonios ──────────────────────────────
   * Portado del de la VSL, mismo comportamiento exacto.
   *
   * Dos modos:
   *  - Vista previa: mientras la tarjeta está a la vista, el video se
   *    repite en bucle, mudo, de fondo, con el botón de play encima como
   *    invitación.
   *  - Reproducción real: al hacer clic vuelve al segundo 0, se le quita
   *    el mute y suena una sola vez.
   *
   * Solo un video con sonido a la vez. El anterior NO se queda pausado:
   * vuelve a su vista previa muda, igual que las tarjetas que nadie
   * tocó. Por eso "con sonido" es un único video compartido entre todas
   * (videoConSonido) y no un flag por tarjeta.
   *
   * video.load() antes de reproducir con sonido: sin esto, en algunas
   * versiones de Safari en iOS solo se oía la primera tarjeta — el
   * <video> conserva un "esto no vino de un gesto real" de la sesión de
   * autoplay mudo, incluso tras pausar y volver a llamar play().
   * load() fuerza una sesión nueva, atada sin ambigüedad al clic actual.
   * ─────────────────────────────────────────────────────────────────── */
  function iniciarTestimonios() {
    var tarjetas = [];
    var videoConSonido = null;

    var contenedores = document.querySelectorAll("[data-reproductor]");

    Array.prototype.forEach.call(contenedores, function (contenedor) {
      var video = contenedor.querySelector("[data-reproductor-video]");
      var boton = contenedor.querySelector("[data-reproductor-boton]");
      var iconoPlay = contenedor.querySelector("[data-icono-play]");
      var iconoPausa = contenedor.querySelector("[data-icono-pausa]");
      var barra = contenedor.querySelector("[data-reproductor-barra]");
      var relleno = contenedor.querySelector("[data-reproductor-relleno]");
      if (!video || !boton || !iconoPlay || !iconoPausa || !barra || !relleno) return;

      var esElActivo = function () {
        return videoConSonido === video;
      };

      var actualizarBoton = function () {
        var mostrarPlay = !esElActivo() || video.paused;
        iconoPlay.style.display = mostrarPlay ? "" : "none";
        iconoPausa.style.display = mostrarPlay ? "none" : "";
        boton.setAttribute("aria-label", mostrarPlay ? "Reproducir video" : "Pausar video");
        contenedor.classList.toggle(
          "reproductor--reproduciendo",
          esElActivo() && !video.paused
        );
      };

      var volverAVistaPrevia = function () {
        video.loop = true;
        video.muted = true;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        actualizarBoton();
      };

      tarjetas.push({ video: video, volverAVistaPrevia: volverAVistaPrevia });

      contenedor.addEventListener("click", function () {
        if (!esElActivo()) {
          // videoConSonido se actualiza ANTES de devolver el anterior a su
          // vista previa: así el actualizarBoton() de esa tarjeta ya ve
          // esElActivo() en false y le pinta el ícono de play correcto.
          var anterior = videoConSonido;
          videoConSonido = video;
          if (anterior) {
            for (var i = 0; i < tarjetas.length; i++) {
              if (tarjetas[i].video === anterior) {
                tarjetas[i].volverAVistaPrevia();
                break;
              }
            }
          }

          video.pause();
          video.loop = false;
          video.muted = false;
          video.load();
          video.currentTime = 0;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else if (video.paused) {
          var p2 = video.play();
          if (p2 && p2.catch) p2.catch(function () {});
        } else {
          video.pause();
        }
        actualizarBoton();
      });

      video.addEventListener("play", actualizarBoton);
      video.addEventListener("pause", actualizarBoton);

      video.addEventListener("timeupdate", function () {
        if (!video.duration) return;
        var porcentaje = (video.currentTime / video.duration) * 100;
        relleno.style.width = porcentaje + "%";
        barra.setAttribute("aria-valuenow", String(Math.round(porcentaje)));
      });

      // La vista previa muda no arranca con reduced-motion: es video que
      // se mueve solo, exactamente lo que esa preferencia pide evitar.
      // El botón de play sigue ahí y funciona igual.
      if (!menosMovimiento && "IntersectionObserver" in window) {
        var observador = new IntersectionObserver(
          function (entradas) {
            var entrada = entradas[0];
            if (!entrada) return;
            if (entrada.isIntersecting) {
              if (!esElActivo()) {
                video.loop = true;
                video.muted = true;
                var p = video.play();
                if (p && p.catch) p.catch(function () {});
              }
            } else if (!esElActivo()) {
              // El else se restringe a !esElActivo() a propósito: en
              // reproducción real, pulsar el botón cuando la tarjeta está
              // medio fuera de pantalla hace que el navegador la scrollee
              // a la vista, y ese scroll cruzaba el umbral y pausaba el
              // video justo después de arrancar con sonido.
              video.pause();
            }
          },
          { threshold: 0.6 }
        );
        observador.observe(contenedor);
      }

      actualizarBoton();
      // Se le quitan los controles nativos recién ahora: hasta este punto
      // el video se podía reproducir aunque este script no hubiera
      // llegado a correr.
      video.removeAttribute("controls");
    });
  }

  function iniciar() {
    iniciarRevelar();
    iniciarBarraFija();
    iniciarCupos();
    iniciarTestimonios();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
