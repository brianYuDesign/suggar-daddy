declare module 'class-validator' {
  export function IsString(options?: { each?: boolean }): PropertyDecorator;
  export function IsOptional(): PropertyDecorator;
  export function IsNumber(): PropertyDecorator;
  export function IsArray(): PropertyDecorator;
  export function IsIn(values: readonly string[]): PropertyDecorator;
  export function Min(n: number): PropertyDecorator;
}
