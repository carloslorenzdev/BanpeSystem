import { Toaster as BaseSileoToaster } from 'sileo';
import 'sileo/styles.css';

/**
 * Notificador Sileo con animaciones de física elástica y diseño moderno
 * Documentación: https://sileo.aaryan.design/
 */
export function SileoToaster() {
    return (
        <BaseSileoToaster
            position="top-center"
            theme="system"
            options={{
                roundness: 16,
            }}
        />
    );
}

export { SileoToaster as Toaster };
export default SileoToaster;
