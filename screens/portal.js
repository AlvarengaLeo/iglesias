/* global React, Icon, Badge */
// Portal screen — editor with live preview

const {
  useState: useStateO
} = React;
const PortalScreen = ({
  onToast
}) => {
  const [section, setSection] = useStateO('Identidad');
  const [device, setDevice] = useStateO('desktop');
  const [hasChanges, setHasChanges] = useStateO(true);
  const sections = [{
    id: 'Identidad',
    icon: 'sparkle'
  }, {
    id: 'Inicio',
    icon: 'home'
  }, {
    id: 'Horarios',
    icon: 'clock'
  }, {
    id: 'Donaciones',
    icon: 'handHeart'
  }, {
    id: 'Campañas visibles',
    icon: 'target'
  }, {
    id: 'Contacto',
    icon: 'phone'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting",
    style: {
      margin: 0
    }
  }, "Portal"), /*#__PURE__*/React.createElement(Badge, {
    tone: hasChanges ? 'warning' : 'success',
    dot: true
  }, hasChanges ? 'Cambios sin publicar' : 'Publicado')), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Administra la informaci\xF3n p\xFAblica de tu iglesia \xB7 iglesiacr.app/casaderestauracion")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 14
  }), " Vista previa"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => onToast({
      title: 'Cambios guardados',
      sub: 'Tu portal sigue en borrador hasta que publiques.'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 14
  }), " Guardar cambios"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => {
      setHasChanges(false);
      onToast({
        title: 'Portal publicado',
        sub: 'Los cambios ya son visibles para tu comunidad.'
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rocket",
    size: 14
  }), " Publicar portal"))), hasChanges && /*#__PURE__*/React.createElement("div", {
    className: "banner",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Hay cambios sin publicar."), " Tu comunidad a\xFAn ve la versi\xF3n anterior del portal hasta que publiques."), /*#__PURE__*/React.createElement("div", {
    className: "banner-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost"
  }, "Descartar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-coffee",
    onClick: () => {
      setHasChanges(false);
      onToast({
        title: 'Portal publicado'
      });
    }
  }, "Publicar ahora"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '420px 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      padding: '4px 12px 8px'
    }
  }, "Secciones del portal"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, sections.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    onClick: () => setSection(s.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      border: 'none',
      background: section === s.id ? 'var(--bg-2)' : 'transparent',
      borderRadius: 8,
      color: section === s.id ? 'var(--text)' : 'var(--muted)',
      fontWeight: section === s.id ? 700 : 500,
      fontSize: 13,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 15
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, s.id), section === s.id && /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 14
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-header"
  }, /*#__PURE__*/React.createElement("h3", null, "Editar \xB7 ", section)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, section === 'Identidad' && /*#__PURE__*/React.createElement(IdentidadEditor, null), section === 'Inicio' && /*#__PURE__*/React.createElement(InicioEditor, null), section === 'Horarios' && /*#__PURE__*/React.createElement(HorariosEditor, null), section === 'Donaciones' && /*#__PURE__*/React.createElement(DonacionesEditor, null), section === 'Campañas visibles' && /*#__PURE__*/React.createElement(CampañasEditor, null), section === 'Contacto' && /*#__PURE__*/React.createElement(ContactoEditor, null)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 88,
      alignSelf: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, "Vista previa en vivo"), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab ${device === 'desktop' ? 'active' : ''}`,
    onClick: () => setDevice('desktop')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "monitor",
    size: 12
  }), " Escritorio"), /*#__PURE__*/React.createElement("button", {
    className: `tab ${device === 'mobile' ? 'active' : ''}`,
    onClick: () => setDevice('mobile')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "smartphone",
    size: 12
  }), " M\xF3vil"))), device === 'desktop' ? /*#__PURE__*/React.createElement("div", {
    className: "browser-frame"
  }, /*#__PURE__*/React.createElement("div", {
    className: "browser-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "browser-dots"
  }, /*#__PURE__*/React.createElement("div", {
    className: "browser-dot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "browser-dot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "browser-dot"
  })), /*#__PURE__*/React.createElement("div", {
    className: "browser-url"
  }, "iglesiacr.app/casaderestauracion")), /*#__PURE__*/React.createElement(DesktopPreview, null)) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      background: 'var(--bg-2)',
      borderRadius: 12,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "phone-frame"
  }, /*#__PURE__*/React.createElement("div", {
    className: "phone-screen"
  }, /*#__PURE__*/React.createElement(MobilePreview, null))))))));
};

// ============ Editors ============

const IdentidadEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Logo"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: 'var(--coffee)',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 18
  }
}, "CR"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-secondary btn-sm"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "upload",
  size: 12
}), " Subir nuevo logo"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 4
  }
}, "PNG o SVG \xB7 M\xEDnimo 200\xD7200px")))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Nombre legal"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "Iglesia Casa de Restauraci\xF3n Inc."
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Nombre p\xFAblico ", /*#__PURE__*/React.createElement("span", {
  className: "hint"
}, "(aparece en el portal)")), /*#__PURE__*/React.createElement("input", {
  defaultValue: "Casa de Restauraci\xF3n"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Color principal del portal"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8
  }
}, ['#1F2B38', '#8A6A4A', '#3D5681', '#4F9D7B', '#C25C5C'].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: c,
  style: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: c,
    cursor: 'pointer',
    border: i === 1 ? '3px solid #fff' : '3px solid transparent',
    boxShadow: i === 1 ? '0 0 0 2px var(--navy)' : 'none'
  }
})))));
const InicioEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "T\xEDtulo principal"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "Una casa de fe, restauraci\xF3n y comunidad"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Mensaje de bienvenida"), /*#__PURE__*/React.createElement("textarea", {
  rows: 3,
  defaultValue: "Somos una iglesia hispana en Miami donde toda familia encuentra un hogar espiritual. Te invitamos a visitarnos cada domingo."
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Imagen principal"), /*#__PURE__*/React.createElement("div", {
  style: {
    border: '1.5px dashed var(--border)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
    background: 'var(--bg)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'var(--card)',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 10px',
    color: 'var(--muted)'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "image"
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600
  }
}, "congregacion-domingo.jpg"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, "1920\xD71080 \xB7 240 KB"), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-secondary",
  style: {
    marginTop: 10
  }
}, "Cambiar imagen"))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Texto del bot\xF3n principal"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "Donar ahora"
})));
const HorariosEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  }
}, [{
  day: 'Domingo',
  time: '10:00 AM',
  type: 'Servicio dominical',
  addr: 'Sede principal'
}, {
  day: 'Domingo',
  time: '6:00 PM',
  type: 'Servicio bilingüe',
  addr: 'Sede principal'
}, {
  day: 'Miércoles',
  time: '7:30 PM',
  type: 'Estudio bíblico',
  addr: 'Online + presencial'
}, {
  day: 'Viernes',
  time: '7:00 PM',
  type: 'Jóvenes y adolescentes',
  addr: 'Salón de jóvenes'
}].map((h, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    display: 'grid',
    gridTemplateColumns: '90px 90px 1fr auto',
    gap: 8,
    padding: 12,
    background: 'var(--bg)',
    borderRadius: 10,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("input", {
  defaultValue: h.day,
  style: {
    padding: '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    background: 'var(--card)'
  }
}), /*#__PURE__*/React.createElement("input", {
  defaultValue: h.time,
  style: {
    padding: '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    background: 'var(--card)'
  }
}), /*#__PURE__*/React.createElement("input", {
  defaultValue: h.type,
  style: {
    padding: '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    background: 'var(--card)'
  }
}), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-sm btn-ghost",
  style: {
    padding: 6
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "x",
  size: 14
})))), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-secondary",
  style: {
    alignSelf: 'flex-start'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "plus",
  size: 14
}), " Agregar reuni\xF3n"));
const DonacionesEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Texto del bot\xF3n donar"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "Donar ahora"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Fondo predeterminado"), /*#__PURE__*/React.createElement("select", null, /*#__PURE__*/React.createElement("option", null, "Fondo General"), /*#__PURE__*/React.createElement("option", null, "Diezmos"), /*#__PURE__*/React.createElement("option", null, "Ofrendas"))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Frecuencias visibles"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, [{
  l: 'Única',
  a: true
}, {
  l: 'Mensual',
  a: true
}, {
  l: 'Anual',
  a: false
}].map(f => /*#__PURE__*/React.createElement("button", {
  key: f.l,
  className: `chip ${f.a ? 'active' : ''}`
}, f.l)))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Mostrar donaciones recurrentes"), /*#__PURE__*/React.createElement("div", {
  className: "hint"
}, "Tus donantes podr\xE1n configurar aportes autom\xE1ticos.")), /*#__PURE__*/React.createElement("div", {
  className: "toggle on"
}))));
const CampañasEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "hint",
  style: {
    fontSize: 12,
    color: 'var(--muted)'
  }
}, "Selecciona las campa\xF1as visibles en el portal p\xFAblico."), [{
  name: 'Fondo de construcción',
  raised: 32400,
  goal: 50000,
  on: true
}, {
  name: 'Misiones 2026',
  raised: 11200,
  goal: 12000,
  on: true
}, {
  name: 'Ayuda comunitaria',
  raised: 1280,
  goal: 5000,
  on: false
}].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'var(--bg)',
    borderRadius: 10,
    border: '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--coffee-bg)',
    color: 'var(--coffee)',
    display: 'grid',
    placeItems: 'center'
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "target",
  size: 16
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600
  }
}, c.name), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'var(--muted)'
  }
}, "$", c.raised.toLocaleString(), " de $", c.goal.toLocaleString())), /*#__PURE__*/React.createElement("div", {
  className: `toggle ${c.on ? 'on' : ''}`
}))));
const ContactoEditor = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Direcci\xF3n"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "2310 SW 27th Ave, Miami FL 33145"
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "(305) 555-0100"
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Email"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "hola@casaderestauracion.org"
}))), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Enlace de mapa"), /*#__PURE__*/React.createElement("input", {
  defaultValue: "https://maps.google.com/?q=..."
})), /*#__PURE__*/React.createElement("div", {
  className: "field"
}, /*#__PURE__*/React.createElement("label", null, "Redes sociales"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, ['Facebook', 'Instagram', 'YouTube', 'WhatsApp'].map(r => /*#__PURE__*/React.createElement("div", {
  key: r,
  style: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'var(--bg-2)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--muted)',
    fontSize: 11,
    fontWeight: 600
  }
}, r[0]), /*#__PURE__*/React.createElement("input", {
  defaultValue: `@casaderestauracion`,
  style: {
    flex: 1,
    padding: '7px 10px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12
  }
}))))));

// ============ Live Preview ============

const DesktopPreview = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    fontSize: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderBottom: '1px solid #EEF0F3'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'var(--coffee)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 11
  }
}, "CR"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginLeft: 10,
    fontWeight: 700,
    color: 'var(--text)'
  }
}, "Casa de Restauraci\xF3n"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 18,
    fontSize: 11,
    color: 'var(--muted)'
  }
}, /*#__PURE__*/React.createElement("span", null, "Inicio"), /*#__PURE__*/React.createElement("span", null, "Horarios"), /*#__PURE__*/React.createElement("span", null, "Donar"), /*#__PURE__*/React.createElement("span", null, "Contacto"))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '40px 28px 36px',
    background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)',
    color: '#fff',
    position: 'relative'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#B89A7A',
    fontWeight: 600,
    marginBottom: 8,
    letterSpacing: '0.04em'
  }
}, "IGLESIA HISPANA \xB7 MIAMI"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    marginBottom: 8,
    maxWidth: '70%'
  }
}, "Una casa de fe, restauraci\xF3n y comunidad"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    maxWidth: '60%',
    lineHeight: 1.4
  }
}, "Somos una iglesia hispana donde toda familia encuentra un hogar espiritual."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '7px 14px',
    borderRadius: 8,
    background: '#8A6A4A',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: 11
  }
}, "Donar ahora"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '7px 14px',
    borderRadius: 8,
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    fontWeight: 600,
    fontSize: 11
  }
}, "Vis\xEDtanos"))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '28px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: 'var(--coffee)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8
  }
}, "Nuestros servicios"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14
  }
}, "Horarios de reuni\xF3n"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8
  }
}, [['Domingo · 10:00 AM', 'Servicio dominical'], ['Domingo · 6:00 PM', 'Servicio bilingüe'], ['Miércoles · 7:30 PM', 'Estudio bíblico'], ['Viernes · 7:00 PM', 'Jóvenes']].map((h, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    padding: '10px 12px',
    border: '1px solid var(--border-soft)',
    borderRadius: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: 'var(--muted)'
  }
}, h[0]), /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 11
  }
}, h[1]))))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '0 28px 28px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: 'var(--coffee)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8
  }
}, "Campa\xF1as activas"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14
  }
}, "Apoya con tu donaci\xF3n"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  }
}, [['Fondo de construcción', 32400, 50000], ['Misiones 2026', 11200, 12000]].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    padding: 12,
    background: 'var(--bg)',
    borderRadius: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 11,
    marginBottom: 6
  }
}, c[0]), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 5,
    background: '#fff',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: `${c[1] / c[2] * 100}%`,
    height: '100%',
    background: 'var(--coffee)'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'var(--muted)'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700,
    color: 'var(--text)'
  }
}, "$", c[1].toLocaleString()), /*#__PURE__*/React.createElement("span", null, "de $", c[2].toLocaleString())))))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 28px',
    background: 'var(--bg)',
    borderTop: '1px solid var(--border-soft)',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'var(--muted)'
  }
}, /*#__PURE__*/React.createElement("span", null, "2310 SW 27th Ave, Miami FL 33145"), /*#__PURE__*/React.createElement("span", null, "(305) 555-0100 \xB7 hola@casaderestauracion.org")));
const MobilePreview = () => /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    background: '#fff',
    height: '100%',
    overflowY: 'auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 16px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: 'var(--coffee)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 9
  }
}, "CR"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 700,
    fontSize: 11
  }
}, "Casa de Restauraci\xF3n")), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 16px 24px',
    background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)',
    color: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 9,
    color: '#B89A7A',
    fontWeight: 600,
    marginBottom: 6
  }
}, "IGLESIA HISPANA"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 8
  }
}, "Una casa de fe y restauraci\xF3n"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 9,
    opacity: 0.7,
    marginBottom: 12
  }
}, "Toda familia encuentra un hogar."), /*#__PURE__*/React.createElement("button", {
  style: {
    width: '100%',
    padding: '8px',
    borderRadius: 6,
    background: 'var(--coffee)',
    color: '#fff',
    border: 'none',
    fontSize: 10,
    fontWeight: 600
  }
}, "Donar ahora")), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '16px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 8,
    color: 'var(--coffee)',
    fontWeight: 700,
    marginBottom: 4
  }
}, "HORARIOS"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  }
}, [['Domingo · 10:00 AM', 'Dominical'], ['Miércoles · 7:30 PM', 'Estudio bíblico']].map((h, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    padding: 8,
    border: '1px solid var(--border-soft)',
    borderRadius: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 8,
    color: 'var(--muted)'
  }
}, h[0]), /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 9
  }
}, h[1]))))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '0 16px 16px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 8,
    color: 'var(--coffee)',
    fontWeight: 700,
    marginBottom: 4
  }
}, "CAMPA\xD1AS"), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 10,
    background: 'var(--bg)',
    borderRadius: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    fontSize: 9,
    marginBottom: 4
  }
}, "Fondo de construcci\xF3n"), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 4,
    background: '#fff',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: '65%',
    height: '100%',
    background: 'var(--coffee)'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 8,
    color: 'var(--muted)'
  }
}, "$32,400 de $50,000"))));
window.PortalScreen = PortalScreen;