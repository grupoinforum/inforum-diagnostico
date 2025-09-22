export default function Page() {
  return (
    <div className="quiz">
      <h1>Diagnóstico para Radiografía de Software de Gestión Empresarial</h1>
      <p>Completa el cuestionario y conoce tu resultado al instante.</p>

      <div className="question-block">
        <p>¿En qué industria opera la compañía?</p>
        <label><input type="radio" name="industria" /> Producción</label>
        <label><input type="radio" name="industria" /> Distribución</label>
        <label><input type="radio" name="industria" /> Retail</label>
        <label><input type="radio" name="industria" /> Servicios</label>
        <label><input type="radio" name="industria" /> Otro (especificar)</label>
      </div>

      <div className="question-block">
        <p>¿Qué sistema empresarial (ERP) utiliza actualmente su empresa?</p>
        <label><input type="radio" name="erp" /> SAP Business One</label>
        <label><input type="radio" name="erp" /> Odoo</label>
        <label><input type="radio" name="erp" /> Oracle</label>
        <label><input type="radio" name="erp" /> Microsoft Dynamics</label>
        <label><input type="radio" name="erp" /> Sistema Propio</label>
        <label><input type="radio" name="erp" /> Otro (especificar)</label>
      </div>

      <div className="question-block">
        <p>¿Cuántas personas dependen del sistema para su trabajo diario?</p>
        <label><input type="radio" name="personas" /> +20 personas</label>
        <label><input type="radio" name="personas" /> -20 personas</label>
      </div>

      <div className="question-block">
        <p>¿La compañía opera en 1 o varios países?</p>
        <label><input type="radio" name="paises" /> 1 país</label>
        <label><input type="radio" name="paises" /> Varios países</label>
      </div>

      <div className="question-block">
        <p>¿Cuántas líneas de negocio tiene la compañía?</p>
        <label><input type="radio" name="lineas" /> 1 línea de negocio</label>
        <label><input type="radio" name="lineas" /> Múltiples líneas de negocio</label>
      </div>

      <div className="question-block">
        <p>¿Nivel de satisfacción con el sistema actual?</p>
        <label><input type="radio" name="satisfaccion" /> 1-3 (insatisfecho)</label>
        <label><input type="radio" name="satisfaccion" /> 4-6 (puede mejorar)</label>
        <label><input type="radio" name="satisfaccion" /> 7-10 (cumple)</label>
      </div>

      <div className="question-block">
        <p>¿La empresa es pro-tecnología?</p>
        <label><input type="radio" name="pro_tech" /> Sí</label>
        <label><input type="radio" name="pro_tech" /> No</label>
      </div>

      <button type="submit">Siguiente</button>
    </div>
  );
}
