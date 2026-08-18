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

  // Los dos clips de "antes y después" no son un reproductor: no llevan
  // botón, ni barra, ni sonido. Son dos imágenes en movimiento que se
  // comparan de un vistazo, y cualquier control encima invita a tocarlas
  // en vez de a mirarlas. Aquí solo se decide cuándo corren y que corran
  // a la par.
  function iniciarComparativa() {
    var clips = document.querySelectorAll("[data-bucle]");
    if (!clips.length) return;

    // Con "menos movimiento" no arrancan solos — es literalmente video que
    // se mueve sin que nadie lo pida. En ese caso se les dejan los
    // controles nativos que traen del HTML, o no habría forma de verlos.
    if (menosMovimiento) return;

    Array.prototype.forEach.call(clips, function (video) {
      video.removeAttribute("controls");
      if (!("IntersectionObserver" in window)) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        return;
      }
      var observador = new IntersectionObserver(
        function (entradas) {
          var entrada = entradas[0];
          if (!entrada) return;
          if (entrada.isIntersecting) {
            var q = video.play();
            if (q && q.catch) q.catch(function () {});
          } else {
            video.pause();
          }
        },
        { threshold: 0.35 }
      );
      observador.observe(video);
    });

    // Los dos son la misma toma. Si van desfasados la comparación deja de
    // leerse: cuesta emparejar qué momento del original corresponde a qué
    // momento del editado. Se arrancan juntos y se corrige la deriva,
    // incluida la del bucle — duran 33,83 y 33,87 s, así que sin esto se
    // separan en cada vuelta.
    var caja = document.querySelector(".comparativa");
    var antes = document.querySelector('[data-bucle][poster*="antes"]');
    var despues = document.querySelector('[data-bucle][poster*="despues"]');
    if (!caja || !antes || !despues) return;

    antes.addEventListener("timeupdate", function () {
      if (antes.paused || despues.paused) return;
      // El margen es 0,35 s y no menos: por debajo del cuarto de segundo
      // la corrección se dispara cada dos por tres y se ve como un tirón.
      if (Math.abs(antes.currentTime - despues.currentTime) > 0.35) {
        despues.currentTime = antes.currentTime;
      }
    });

    if (!("IntersectionObserver" in window)) return;
    var sincronizador = new IntersectionObserver(
      function (entradas) {
        var entrada = entradas[0];
        if (!entrada || !entrada.isIntersecting) return;
        antes.currentTime = 0;
        despues.currentTime = 0;
      },
      { threshold: 0.4 }
    );
    sincronizador.observe(caja);
  }

  // El video de presentación usa el mismo reproductor que los testimonios
  // y entra en su grupo — vista previa muda en bucle, sonido al pulsar,
  // uno solo sonando a la vez. Sin controles nativos en ningún momento:
  // play, pausa y pantalla completa, nada más.
  function iniciarVsl() {
    var contenedores = document.querySelectorAll("[data-pantalla-completa]");
    var esMovil = window.matchMedia("(max-width: 767px)");

    Array.prototype.forEach.call(contenedores, function (contenedor) {
      var video = contenedor.querySelector("[data-reproductor-video]");
      var boton = contenedor.querySelector("[data-vsl-completa]");
      if (!video) return;

      // 1 · En pausa aparece un aviso de "dale play". El botón por sí solo
      // se lee como decoración sobre un fotograma congelado, y con 2:19 por
      // delante conviene decir explícitamente que aquello sigue.
      //
      // La condición es !video.loop: loop en true es la vista previa muda,
      // donde la pausa la manda el observador al salir de pantalla y no el
      // usuario. El tiempo no se toca — se reanuda donde se quedó.
      // La pantalla completa se fuerza UNA sola vez, en el primer clic con
      // sonido. A partir de ahí forzarla sería secuestrar el gesto: quien
      // ya la vio y salió, salió por algo. En su lugar el botón se pone a
      // saltar, con el mismo salto de reposo que llevan los CTA.
      var yaForzada = false;
      // `abriendo` cubre el hueco entre pedir la pantalla completa y que
      // el navegador la conceda: son dos gestos posibles en el mismo clic
      // (el botón y el contenedor), y sin la bandera el segundo pediría
      // otra vez sobre la primera petición todavía en vuelo.
      var abriendo = false;

      var dentro = function () {
        return document.fullscreenElement === contenedor;
      };

      var pintarEstado = function () {
        contenedor.classList.toggle("reproductor--en-pausa", !video.loop && video.paused);
        contenedor.classList.toggle(
          "reproductor--sugiere",
          yaForzada && !dentro() && !abriendo && !video.muted && !video.paused
        );
      };
      video.addEventListener("pause", pintarEstado);
      video.addEventListener("play", pintarEstado);

      // A partir de aquí todo depende del botón. El aviso de pausa de
      // arriba no, y por eso queda antes de esta salida.
      if (!boton) return;
      var etiqueta = boton.querySelector("[data-vsl-completa-texto]");
      var iconoAbrir = boton.querySelector("[data-icono-abrir]");
      var iconoCerrar = boton.querySelector("[data-icono-cerrar]");

      // Nace oculto en el HTML: sin JS sería un botón muerto.
      boton.removeAttribute("hidden");

      var pintar = function () {
        var d = dentro();
        if (etiqueta) etiqueta.textContent = d ? "Salir" : "Pantalla completa";
        if (iconoAbrir) iconoAbrir.style.display = d ? "none" : "";
        if (iconoCerrar) iconoCerrar.style.display = d ? "" : "none";
        boton.setAttribute("aria-label", d ? "Salir de pantalla completa" : "Ver en pantalla completa");
        contenedor.classList.toggle("reproductor--completa", d);
      };

      // 2 · Abrir en pantalla completa y pedir horizontal, que es como se
      // grabó. El giro solo lo concede Android; en escritorio y en iOS la
      // promesa se rechaza y no pasa nada — por eso el botón existe en vez
      // de depender del giro automático.
      var soltar = function () {
        abriendo = false;
      };

      var abrir = function () {
        if (abriendo || dentro()) return;
        abriendo = true;
        // El iPhone no da pantalla completa a un div: solo el <video>
        // tiene webkitEnterFullscreen, y ese reproductor nativo ya gira
        // solo con video apaisado. El iPad sí soporta la API estándar, y
        // por eso se mira fullscreenEnabled y no el sistema operativo.
        if (!document.fullscreenEnabled && typeof video.webkitEnterFullscreen === "function") {
          try {
            video.webkitEnterFullscreen();
          } catch (e) {}
          soltar();
          return;
        }
        var pedir = contenedor.requestFullscreen || contenedor.webkitRequestFullscreen;
        if (!pedir) return soltar();
        var abierto = pedir.call(contenedor);
        if (!abierto || !abierto.then) return soltar();
        abierto
          .then(function () {
            soltar();
            if (!esMovil.matches) return;
            if (!screen.orientation || !screen.orientation.lock) return;
            var giro = screen.orientation.lock("landscape");
            // El giro solo lo concede Android. En iOS y en escritorio la
            // promesa se rechaza y no pasa nada: por eso la pantalla
            // completa se ofrece con un botón en vez de depender del giro.
            if (giro && giro.catch) giro.catch(function () {});
          })
          .catch(soltar);
      };

      boton.addEventListener("click", function (evento) {
        if (dentro()) {
          evento.stopPropagation();
          if (document.exitFullscreen) document.exitFullscreen();
          return;
        }
        // El contenedor entero es el play/pausa. Si el video ya está
        // sonando, el clic no debe llegar hasta él: lo pausaría justo al
        // abrir. Si todavía está en vista previa muda, en cambio, sí
        // interesa que llegue — es el mismo gesto que lo activa con
        // sonido, y abrir en grande un bucle mudo no tiene sentido.
        if (!video.muted && !video.paused) evento.stopPropagation();
        abrir();
      });

      // 3 · En celular, el primer clic con sonido abre pantalla completa de
      // una: una grabación de escritorio metida en 390px no se lee. Va en
      // el mismo clic a propósito — pantalla completa exige gesto del
      // usuario vivo, y esperar al evento "play" llegaría fuera de plazo.
      // Este listener corre después del de iniciarTestimonios, que se
      // registra antes y ya quitó el mute.
      contenedor.addEventListener("click", function () {
        if (esMovil.matches && !video.muted && !dentro() && !yaForzada) {
          yaForzada = true;
          abrir();
        }
        pintarEstado();
      });

      document.addEventListener("fullscreenchange", function () {
        // Al salir se suelta la orientación: dejarla bloqueada se llevaría
        // por delante el resto de la página.
        if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
        pintar();
        pintarEstado();
      });

      pintar();
    });
  }

  // ══ Consentimiento y terceros ══════════════════════════════════════
  // Regla del proyecto, sin excepciones: ni una peticion de red a un
  // tercero antes de que el visitante decida. Nada de aqui abajo se
  // ejecuta al arrancar — todo se registra con alConsentir() y solo corre
  // si su categoria tiene permiso, sea ahora o cuando lo conceda mas tarde
  // desde el pie.
  var IDS = {
    metaPixel: "1555727432954581",
    clarity: "y46j54itlv",
  };

  var CLAVE_CONSENTIMIENTO = "capcut-club:consentimiento";
  var permisos = null; // null = todavia no ha decidido
  var cola = [];

  function leerPermisos() {
    try {
      var crudo = localStorage.getItem(CLAVE_CONSENTIMIENTO);
      if (!crudo) return null;
      var d = JSON.parse(crudo);
      if (!d || typeof d !== "object") return null;
      return { analitica: d.analitica === true, marketing: d.marketing === true };
    } catch (e) {
      // Modo privado, almacenamiento lleno o JSON corrupto. Sin memoria se
      // vuelve a preguntar, que es el lado seguro de este error.
      return null;
    }
  }

  function guardarPermisos(p) {
    try {
      localStorage.setItem(CLAVE_CONSENTIMIENTO, JSON.stringify(p));
    } catch (e) {}
  }

  // Incluso con permiso, un script de tercero no compite con el render.
  function enReposo(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 200);
  }

  function alConsentir(categoria, nombre, fn) {
    cola.push({ categoria: categoria, nombre: nombre, fn: fn, hecho: false });
    liberarCola();
  }

  function liberarCola() {
    if (!permisos) return;
    for (var i = 0; i < cola.length; i++) {
      var t = cola[i];
      if (t.hecho || !permisos[t.categoria]) continue;
      // Se marca ANTES de ejecutar: si fn lanza, no se reintenta en bucle
      // cada vez que alguien vuelva a tocar las preferencias.
      t.hecho = true;
      enReposo(envolver(t));
    }
  }

  function envolver(t) {
    return function () {
      try {
        t.fn();
      } catch (e) {}
    };
  }

  // Un script de tercero falla por dos motivos muy distintos y hay que
  // distinguirlos, o se acaba reintentando contra un bloqueador de
  // anuncios: si el error llega casi instantaneo es que lo ha cortado una
  // extension o el navegador — eso es intencional y no se reintenta. Si
  // tarda, es red de verdad y ahi si vale un segundo intento.
  // En los dos casos se abandona en silencio: un pixel que no carga no
  // debe ensuciar la consola ni afectar a la pagina.
  function cargarScript(src, intentos) {
    var restantes = typeof intentos === "number" ? intentos : 2;
    var pedir = function (n) {
      var arrancado = Date.now();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onerror = function () {
        var bloqueado = Date.now() - arrancado < 250;
        if (bloqueado || n >= restantes - 1) return;
        setTimeout(function () {
          pedir(n + 1);
        }, n === 0 ? 1000 : 3000);
      };
      document.head.appendChild(s);
    };
    pedir(0);
  }

  // ── Los terceros, en cola ───────────────────────────────────────────
  function registrarTerceros() {
    if (IDS.metaPixel) {
      alConsentir("marketing", "Meta Pixel", function () {
        if (window.fbq) return;
        var n = (window.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        });
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        cargarScript("https://connect.facebook.net/en_US/fbevents.js");
        window.fbq("init", IDS.metaPixel);
        window.fbq("track", "PageView");
      });
    }

    if (IDS.clarity) {
      alConsentir("analitica", "Microsoft Clarity", function () {
        window.clarity =
          window.clarity ||
          function () {
            (window.clarity.q = window.clarity.q || []).push(arguments);
          };
        cargarScript("https://www.clarity.ms/tag/" + IDS.clarity);
      });
    }
  }

  function iniciarConsentimiento() {
    permisos = leerPermisos();
    registrarTerceros();

    var caja = document.querySelector("[data-consentimiento]");
    var reabrir = document.querySelector("[data-cookies-reabrir]");
    if (!caja) return;

    var panel = caja.querySelector("[data-cookies-panel]");
    var casillas = caja.querySelectorAll("[data-cookies-categoria]");
    var btnConfigurar = caja.querySelector("[data-cookies-configurar]");
    var btnGuardar = caja.querySelector("[data-cookies-guardar]");
    var btnAceptar = caja.querySelector("[data-cookies-aceptar]");
    var btnRechazar = caja.querySelector("[data-cookies-rechazar]");

    var abrir = function (conPanel, conFoco) {
      // Las casillas reflejan lo ya decidido: reabrir las preferencias y
      // encontrarlas en blanco haria pensar que se ha revocado algo.
      Array.prototype.forEach.call(casillas, function (c) {
        c.checked = !!(permisos && permisos[c.getAttribute("data-cookies-categoria")]);
      });
      if (panel) panel.hidden = !conPanel;
      if (btnConfigurar) btnConfigurar.hidden = conPanel;
      if (btnGuardar) btnGuardar.hidden = !conPanel;
      caja.removeAttribute("hidden");
      document.body.classList.add("consentimiento-abierto");
      if (conFoco && btnAceptar) btnAceptar.focus();
    };

    var cerrar = function () {
      caja.setAttribute("hidden", "");
      document.body.classList.remove("consentimiento-abierto");
    };

    var decidir = function (p) {
      permisos = p;
      guardarPermisos(p);
      cerrar();
      liberarCola();
    };

    if (btnAceptar) {
      btnAceptar.addEventListener("click", function () {
        decidir({ analitica: true, marketing: true });
      });
    }
    if (btnRechazar) {
      btnRechazar.addEventListener("click", function () {
        decidir({ analitica: false, marketing: false });
      });
    }
    if (btnConfigurar) {
      btnConfigurar.addEventListener("click", function () {
        abrir(true, false);
      });
    }
    if (btnGuardar) {
      btnGuardar.addEventListener("click", function () {
        var p = { analitica: false, marketing: false };
        Array.prototype.forEach.call(casillas, function (c) {
          p[c.getAttribute("data-cookies-categoria")] = c.checked;
        });
        decidir(p);
      });
    }

    if (reabrir) {
      // Se destapa solo aqui: sin JS no hay tracking que revocar.
      reabrir.removeAttribute("hidden");
      reabrir.addEventListener("click", function () {
        abrir(true, true);
      });
    }

    // Solo se pregunta si no hay respuesta previa. Si ya la hay, los
    // terceros permitidos ya salieron por liberarCola() en alConsentir.
    if (!permisos) abrir(false, false);
  }

  function iniciar() {
    iniciarRevelar();
    iniciarBarraFija();
    iniciarCupos();
    iniciarTestimonios();
    iniciarVsl();
    iniciarComparativa();
    iniciarConsentimiento();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
