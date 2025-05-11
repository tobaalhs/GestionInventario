
/**
 * @jest-environment jsdom 
 */
import { validateRut, formatRut } from './Login';

describe('HU04-Funcionalidad inicio de sesión', () => { 
  describe('Definición de formato de credenciales', () => {
    // Pruebas para validateRut
    describe('validateRut', () => {
      it('validaciion de RUTs con formato correcto', () => {
        expect(validateRut('17.138.973-k')).toBe(true);
        expect(validateRut('12345678-9')).toBe(true);
        expect(validateRut('17.138.973-K')).toBe(true);
      });

      it('validacon de detectar RUTs con formato incorrecto', () => {
        expect(validateRut('123')).toBe(false);
        expect(validateRut('17138973-1')).toBe(false);
      });

    });

    // Pruebas para formatRut
    describe('formatRut', () => {
      it('debe formatear RUTs correctamente', () => {
        expect(formatRut('123456789')).toBe('12.345.678-9');
        expect(formatRut('171389730')).toBe('17.138.973-0');
        expect(formatRut('111111111')).toBe('11.111.111-1');
        expect(formatRut('222222222')).toBe('22.222.222-2');
      });

      it('debe manejar RUTs ya formateados', () => {
        expect(formatRut('12.345.678-9')).toBe('12.345.678-9');
        expect(formatRut('17.138.973-0')).toBe('17.138.973-0');
      });

      it('debe manejar RUTs con letra K', () => {
        expect(formatRut('20922492k')).toBe('20.922.492-k'); 
        expect(formatRut('20922492K')).toBe('20.922.492-K'); 
      });

      it('debe manejar RUTs cortos correctamente', () => {
        expect(formatRut('12')).toBe('1-2');
        expect(formatRut('123')).toBe('12-3');
        expect(formatRut('1234')).toBe('123-4');
      });

    });
  });
});