describe('Hello World Test Suite', () => {
  it('should return "Hello World!"', () => {
    const helloWorld = () => 'Hello World!';
    expect(helloWorld()).toBe('Hello World!');
  });

  it('should not return wrong message', () => {
    const helloWorld = () => 'Hello World!';
    expect(helloWorld()).not.toBe('Hello Universe!');
  });
});
